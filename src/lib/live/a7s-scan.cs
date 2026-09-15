using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Text;

namespace HarborBuddy {
  public static class A7sScan {
    public static string Run(byte[] buf, string guidJson) {
      buf = NormalizeArchive(buf);
      var guids = ParseGuids(guidJson);
      var files = Unpack(buf);
      var buildings = new Dictionary<string, string>();
      var buildingCounts = new Dictionary<string, int>();
      var goods = new Dictionary<string, int>();
      var islands = new Dictionary<string, string>();
      int? money = null;
      int? pending = null;
      var farmers = false; var workers = false; var artisans = false; var engineers = false;
      string session = "";
      byte[] data = null;
      var routes = new List<RouteRow>();
      foreach (var kv in files) {
        if (kv.Key == "meta.a7s") {
          Visit(kv.Value, (path, attr, payload) => {
            if (attr == "CorporationSaveGameName") {
              var t = Utf16(payload);
              if (t.EndsWith(".a7s")) t = t.Substring(0, t.Length - 4);
              if (t.Length > 0) session = t;
            }
          });
        }
        if (kv.Key == "data.a7s") data = kv.Value;
      }
      if (data == null && files.Count > 0) {
        foreach (var kv in files) data = kv.Value;
      }
      if (data != null) {
        Visit(data, (path, attr, payload) => {
          var v = AsI32(payload);
          if (path.EndsWith("CountsPerGUID") && v.HasValue) {
            if (pending == null) pending = v;
            else {
              GuidRow row;
              if (guids.TryGetValue(pending.Value, out row) && row.kind == "building" && v.Value > 0) {
                buildings[row.id] = row.name;
                int prevCount;
                buildingCounts[row.id] = (buildingCounts.TryGetValue(row.id, out prevCount) ? prevCount : 0) + v.Value;
                if (row.id == "farmer-house") farmers = true;
                if (row.id == "worker-house") workers = true;
                if (row.id == "artisan-house") artisans = true;
                if (row.id == "engineer-house") engineers = true;
              }
              pending = null;
            }
          }
          if (attr == "StrgLrg" && payload != null && payload.Length >= 8) {
            for (int i = 0; i + 8 <= payload.Length; i += 8) {
              int g = BitConverter.ToInt32(payload, i);
              int amt = BitConverter.ToInt32(payload, i + 4);
              if (g == 1010017) {
                if (money == null || amt > money.Value) money = amt;
                continue;
              }
              GuidRow row;
              if (guids.TryGetValue(g, out row) && row.kind == "good") goods[row.id] = amt;
            }
          }
          if ((attr == "CurrentlyActiveSession" || attr == "LastActiveSession" || attr == "StartSessionGUID") && v.HasValue) {
            GuidRow row;
            if (guids.TryGetValue(v.Value, out row) && row.kind == "island") islands[row.id] = row.name;
          }
        });
        routes = ExtractRoutes(data, guids);
      }
      var sb = new StringBuilder();
      sb.Append("{\"sessionName\":\"").Append(Esc(session)).Append("\"");
      if (money.HasValue) sb.Append(",\"money\":").Append(money.Value);
      sb.Append(",\"farmers\":").Append(farmers ? "true" : "false");
      sb.Append(",\"workers\":").Append(workers ? "true" : "false");
      sb.Append(",\"artisans\":").Append(artisans ? "true" : "false");
      sb.Append(",\"engineers\":").Append(engineers ? "true" : "false");
      sb.Append(",\"buildings\":[");
      bool first = true;
      foreach (var kv in buildings) {
        if (!first) sb.Append(",");
        first = false;
        int count;
        buildingCounts.TryGetValue(kv.Key, out count);
        sb.Append("{\"id\":\"").Append(Esc(kv.Key)).Append("\",\"name\":\"").Append(Esc(kv.Value)).Append("\",\"count\":").Append(count).Append("}");
      }
      sb.Append("],\"goods\":[");
      first = true;
      foreach (var kv in goods) {
        var name = kv.Key;
        foreach (var g in guids) {
          if (g.Value.id == kv.Key && g.Value.kind == "good") { name = g.Value.name; break; }
        }
        if (!first) sb.Append(",");
        first = false;
        sb.Append("{\"id\":\"").Append(Esc(kv.Key)).Append("\",\"name\":\"").Append(Esc(name)).Append("\",\"amount\":").Append(kv.Value).Append("}");
      }
      sb.Append("],\"islands\":[");
      first = true;
      foreach (var kv in islands) {
        if (!first) sb.Append(",");
        first = false;
        sb.Append("{\"id\":\"").Append(Esc(kv.Key)).Append("\",\"name\":\"").Append(Esc(kv.Value)).Append("\"}");
      }
      sb.Append("],\"routes\":[");
      first = true;
      foreach (var route in routes) {
        if (!first) sb.Append(",");
        first = false;
        sb.Append("{\"name\":\"").Append(Esc(route.Name)).Append("\"");
        if (route.Id.HasValue) sb.Append(",\"id\":").Append(route.Id.Value);
        if (route.OwnerId.HasValue) sb.Append(",\"ownerId\":").Append(route.OwnerId.Value);
        sb.Append(",\"shipCount\":").Append(route.ShipCount).Append(",\"stops\":[");
        bool firstStop = true;
        foreach (var stop in route.Stops) {
          if (!firstStop) sb.Append(",");
          firstStop = false;
          sb.Append("{");
          if (stop.AreaId.HasValue) sb.Append("\"areaId\":").Append(stop.AreaId.Value).Append(",");
          sb.Append("\"goods\":[");
          bool firstGood = true;
          foreach (var good in stop.Goods) {
            if (!firstGood) sb.Append(",");
            firstGood = false;
            sb.Append("{\"guid\":").Append(good.Guid)
              .Append(",\"amount\":").Append(good.Amount);
            if (!string.IsNullOrEmpty(good.Name)) sb.Append(",\"name\":\"").Append(Esc(good.Name)).Append("\"");
            sb.Append("}");
          }
          sb.Append("]}");
        }
        sb.Append("]}");
      }
      sb.Append("]}");
      return sb.ToString();
    }

    struct GuidRow { public string id; public string kind; public string name; }
    sealed class DbLeaf { public string Attr; public byte[] Bytes; }
    sealed class DbNode {
      public string Tag;
      public readonly List<DbLeaf> Leaves = new List<DbLeaf>();
      public readonly List<DbNode> Children = new List<DbNode>();
    }
    sealed class RouteGood { public int Guid; public int Amount; public string Name; }
    sealed class RouteStop {
      public int? AreaId;
      public readonly List<RouteGood> Goods = new List<RouteGood>();
    }
    sealed class RouteRow {
      public int? Id;
      public string Name;
      public int? OwnerId;
      public int ShipCount;
      public readonly List<RouteStop> Stops = new List<RouteStop>();
    }

    static Dictionary<int, GuidRow> ParseGuids(string json) {
      var map = new Dictionary<int, GuidRow>();
      if (string.IsNullOrEmpty(json)) return map;
      int i = 0;
      while (true) {
        int g = json.IndexOf("\"guid\"", i, StringComparison.Ordinal);
        if (g < 0) break;
        int colon = json.IndexOf(':', g);
        int guid = 0;
        if (colon > 0) {
          int p = colon + 1;
          while (p < json.Length && (json[p] == ' ' || json[p] == '\n' || json[p] == '\r' || json[p] == '\t')) p++;
          int q = p;
          while (q < json.Length && json[q] >= '0' && json[q] <= '9') q++;
          if (q > p) int.TryParse(json.Substring(p, q - p), out guid);
        }
        string id = SliceField(json, "id", g);
        string kind = SliceField(json, "kind", g);
        string name = SliceField(json, "name", g);
        if (guid != 0 && id != null) map[guid] = new GuidRow { id = id, kind = kind ?? "", name = name ?? id };
        i = g + 6;
      }
      return map;
    }

    static string SliceField(string s, string field, int from) {
      string key = "\"" + field + "\"";
      int k = s.IndexOf(key, from, StringComparison.Ordinal);
      if (k < 0 || k > from + 400) return null;
      int colon = s.IndexOf(':', k);
      if (colon < 0) return null;
      int a = colon + 1;
      while (a < s.Length && (s[a] == ' ' || s[a] == '\n' || s[a] == '\r' || s[a] == '\t')) a++;
      if (a >= s.Length || s[a] != '"') return null;
      a++;
      int b = s.IndexOf('"', a);
      return b < 0 ? null : s.Substring(a, b - a);
    }
    static string Esc(string s) { return (s ?? "").Replace("\\", "\\\\").Replace("\"", "\\\""); }
    static string Utf16(byte[] p) {
      if (p == null || p.Length < 2) return "";
      return Encoding.Unicode.GetString(p).TrimEnd('\0').Trim();
    }
    static int? AsI32(byte[] p) {
      if (p == null) return null;
      if (p.Length == 4) return BitConverter.ToInt32(p, 0);
      if (p.Length == 2) return BitConverter.ToUInt16(p, 0);
      return null;
    }

    static byte[] NormalizeArchive(byte[] buf) {
      if (buf == null) return new byte[0];
      var magic = Encoding.ASCII.GetBytes("Resource File V2.2");
      int limit = Math.Min(256, buf.Length - magic.Length);
      for (int start = 0; start <= limit; start++) {
        bool match = true;
        for (int i = 0; i < magic.Length; i++) {
          if (buf[start + i] != magic[i]) { match = false; break; }
        }
        if (match) return start == 0 ? buf : SliceBuf(buf, start, buf.Length - start);
      }
      return buf;
    }

    static DbNode Child(DbNode node, string tag) {
      if (node == null) return null;
      foreach (var item in node.Children) if (item.Tag == tag) return item;
      return null;
    }

    static byte[] Leaf(DbNode node, string attr) {
      if (node == null) return null;
      foreach (var item in node.Leaves) if (item.Attr == attr) return item.Bytes;
      return null;
    }

    static int? LeafInt(DbNode node, string attr) { return AsI32(Leaf(node, attr)); }

    static List<RouteRow> ExtractRoutes(byte[] data, Dictionary<int, GuidRow> guids) {
      var output = new List<RouteRow>();
      var root = ParseTree(data);
      var meta = Child(root, "MetaGameManager");
      var manager = Child(meta, "SessionTradeRouteManager");
      var routeMap = Child(manager, "RouteMap");
      if (routeMap == null) return output;
      foreach (var routeNode in routeMap.Children) {
        var owner = Child(routeNode, "Owner");
        var ownerId = LeafInt(owner, "id");
        if (ownerId.HasValue && ownerId.Value != 0) continue;
        var id = LeafInt(routeNode, "ID");
        var nameBytes = Leaf(routeNode, "Name");
        var name = Utf16(nameBytes);
        if (string.IsNullOrEmpty(name)) name = id.HasValue ? ("Ruta " + id.Value) : "Ruta comercial";
        var row = new RouteRow {
          Id = id,
          Name = name,
          OwnerId = ownerId,
          ShipCount = (Leaf(routeNode, "Ships") ?? new byte[0]).Length / 8
        };
        var stations = Child(routeNode, "Stations");
        if (stations != null) {
          foreach (var stopNode in stations.Children) {
            var stop = new RouteStop { AreaId = LeafInt(stopNode, "AreaID") };
            var goodInfos = Child(stopNode, "GoodInfos");
            if (goodInfos != null) {
              foreach (var goodNode in goodInfos.Children) {
                var guid = LeafInt(goodNode, "ProductGUID");
                var amount = LeafInt(goodNode, "Amount");
                if (!guid.HasValue || !amount.HasValue || guid.Value == 0) continue;
                GuidRow guidRow;
                stop.Goods.Add(new RouteGood {
                  Guid = guid.Value,
                  Amount = amount.Value,
                  Name = guids.TryGetValue(guid.Value, out guidRow) ? guidRow.name : ""
                });
              }
            }
            row.Stops.Add(stop);
          }
        }
        output.Add(row);
      }
      return output;
    }

    static DbNode ParseTree(byte[] buf) {
      int magicAt;
      int tagOff;
      int attrOff;
      if (!FindTrailer(buf, out magicAt, out tagOff, out attrOff)) return null;
      var tags = ReadDict(buf, tagOff);
      var attrs = ReadDict(buf, attrOff);
      var root = new DbNode { Tag = "root" };
      var stack = new List<DbNode> { root };
      int pos = 0;
      int nodeEnd = Math.Min(tagOff, buf.Length);
      while (pos + 8 <= nodeEnd) {
        int size = BitConverter.ToInt32(buf, pos);
        int id = BitConverter.ToUInt16(buf, pos + 4);
        pos += 8;
        if (id == 0) {
          if (stack.Count > 1) stack.RemoveAt(stack.Count - 1);
          continue;
        }
        if ((id & 0x8000) != 0) {
          byte[] payload = size > 0 ? SliceBuf(buf, pos, Math.Min(size, nodeEnd - pos)) : new byte[0];
          int pad = (8 - (size % 8)) % 8;
          pos += size + pad;
          string attr;
          if (!attrs.TryGetValue(id, out attr) && !attrs.TryGetValue(id & 0x7FFF, out attr))
            attr = id == 0x8000 ? "None" : ("attr_" + id);
          stack[stack.Count - 1].Leaves.Add(new DbLeaf { Attr = attr, Bytes = payload });
          continue;
        }
        string tag;
        var node = new DbNode { Tag = tags.TryGetValue(id, out tag) ? tag : ("tag_" + id) };
        stack[stack.Count - 1].Children.Add(node);
        stack.Add(node);
      }
      return root;
    }

    static bool FindTrailer(byte[] buf, out int magicAt, out int tagOff, out int attrOff) {
      magicAt = -1; tagOff = -1; attrOff = -1;
      if (buf == null || buf.Length < 20) return false;
      for (int end = buf.Length; end >= 20; end--) {
        if (BitConverter.ToUInt32(buf, end - 4) != 0xFFFFFFFD) continue;
        if (BitConverter.ToInt32(buf, end - 8) != 8) continue;
        int candidateTag = BitConverter.ToInt32(buf, end - 16);
        int candidateAttr = BitConverter.ToInt32(buf, end - 12);
        if (candidateTag <= 0 || candidateTag >= buf.Length || candidateAttr <= 0 || candidateAttr >= buf.Length) continue;
        magicAt = end; tagOff = candidateTag; attrOff = candidateAttr;
        return true;
      }
      return false;
    }

    static List<KeyValuePair<string, byte[]>> Unpack(byte[] buf) {
      var files = new List<KeyValuePair<string, byte[]>>();
      if (buf.Length < 0x318) return files;
      if (Encoding.ASCII.GetString(buf, 0, 18) != "Resource File V2.2") return files;
      long block = BitConverter.ToInt64(buf, 0x310);
      int guard = 0;
      while (block > 0 && block + 32 <= buf.Length && guard++ < 32) {
        int flags = BitConverter.ToInt32(buf, (int)block);
        long dirStored = BitConverter.ToInt64(buf, (int)block + 8);
        long next = BitConverter.ToInt64(buf, (int)block + 24);
        int dirAt = (int)(block - dirStored);
        if (dirAt < 0) break;
        byte[] dir = SliceBuf(buf, dirAt, (int)dirStored);
        if ((flags & 1) != 0) dir = InflateZlib(dir);
        for (int i = 0; i + 560 <= dir.Length; i += 560) {
          string name = Encoding.Unicode.GetString(dir, i, 520).TrimEnd('\0');
          long off = BitConverter.ToInt64(dir, i + 520);
          long stored = BitConverter.ToInt64(dir, i + 528);
          if (string.IsNullOrEmpty(name) || off < 0 || stored <= 0) continue;
          var payload = SliceBuf(buf, (int)off, (int)stored);
          files.Add(new KeyValuePair<string, byte[]>(name, InflateZlib(payload)));
        }
        block = next > 0 && next < buf.Length ? next : 0;
      }
      return files;
    }

    static byte[] SliceBuf(byte[] b, int off, int n) {
      if (off < 0 || n < 0 || off + n > b.Length) return new byte[0];
      var o = new byte[n];
      Buffer.BlockCopy(b, off, o, 0, n);
      return o;
    }

    static byte[] InflateZlib(byte[] payload) {
      if (payload == null || payload.Length < 4) return payload ?? new byte[0];
      try {
        using (var ms = new MemoryStream(payload, 2, Math.Max(0, payload.Length - 6)))
        using (var ds = new DeflateStream(ms, CompressionMode.Decompress))
        using (var outp = new MemoryStream()) {
          ds.CopyTo(outp);
          return outp.ToArray();
        }
      } catch { return payload; }
    }

    static void Visit(byte[] buf, Action<string, string, byte[]> onLeaf) {
      int magicAt;
      int tagOff;
      int attrOff;
      if (!FindTrailer(buf, out magicAt, out tagOff, out attrOff)) return;
      var tags = ReadDict(buf, tagOff);
      var attrs = ReadDict(buf, attrOff);
      var stack = new List<string>();
      int pos = 0;
      int nodeEnd = tagOff;
      if (nodeEnd > buf.Length) nodeEnd = buf.Length;
      while (pos + 8 <= nodeEnd) {
        int size = BitConverter.ToInt32(buf, pos);
        int id = BitConverter.ToUInt16(buf, pos + 4);
        pos += 8;
        if (id == 0) { if (stack.Count > 0) stack.RemoveAt(stack.Count - 1); continue; }
        if ((id & 0x8000) != 0) {
          byte[] payload = size > 0 ? SliceBuf(buf, pos, Math.Min(size, nodeEnd - pos)) : new byte[0];
          int pad = (8 - (size % 8)) % 8;
          pos += size + pad;
          string attr;
          if (!attrs.TryGetValue(id, out attr) && !attrs.TryGetValue(id & 0x7FFF, out attr))
            attr = id == 0x8000 ? "None" : ("attr_" + id);
          string path = string.Join("/", stack.ToArray());
          onLeaf(path, attr, payload);
          continue;
        }
        string tag;
        stack.Add(tags.TryGetValue(id, out tag) ? tag : ("tag_" + id));
      }
    }

    static Dictionary<int, string> ReadDict(byte[] buf, int offset) {
      var map = new Dictionary<int, string>();
      if (offset < 0 || offset + 4 > buf.Length) return map;
      int count = BitConverter.ToInt32(buf, offset);
      if (count <= 0 || count > 50000) return map;
      var ids = new int[count];
      int pos = offset + 4;
      for (int i = 0; i < count; i++) {
        if (pos + 2 > buf.Length) break;
        ids[i] = BitConverter.ToUInt16(buf, pos);
        pos += 2;
      }
      for (int i = 0; i < count; i++) {
        int z = pos;
        while (z < buf.Length && buf[z] != 0) z++;
        map[ids[i]] = Encoding.UTF8.GetString(buf, pos, Math.Max(0, z - pos));
        pos = z + 1;
      }
      return map;
    }
  }
}
