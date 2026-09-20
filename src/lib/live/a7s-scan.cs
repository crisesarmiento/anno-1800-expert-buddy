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
      int? lastParticipant = null;
      var playerStorage = false;
      int? pending = null;
      var farmers = false; var workers = false; var artisans = false; var engineers = false;
      string session = "";
      byte[] data = null;
      var routes = new List<RouteRow>();
      var islandsExtract = new IslandExtract();
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
          if (attr == "ParticipantID" && v.HasValue) lastParticipant = v;
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
            if (lastParticipant.HasValue && lastParticipant.Value == 0) {
              playerStorage = true;
              for (int i = 0; i + 8 <= payload.Length; i += 8) {
                int g = BitConverter.ToInt32(payload, i);
                int amt = BitConverter.ToInt32(payload, i + 4);
                if (g == 1010017) {
                  money = amt;
                  continue;
                }
                GuidRow row;
                if (guids.TryGetValue(g, out row) && row.kind == "good") goods[row.id] = amt;
              }
            }
          }
          if ((attr == "CurrentlyActiveSession" || attr == "LastActiveSession" || attr == "StartSessionGUID") && v.HasValue) {
            GuidRow row;
            if (guids.TryGetValue(v.Value, out row) && row.kind == "island") islands[row.id] = row.name;
          }
        });
        routes = ExtractRoutes(data, guids);
        islandsExtract = ExtractIslands(data, guids);
      }
      var sb = new StringBuilder();
      sb.Append("{\"sessionName\":\"").Append(Esc(session)).Append("\"");
      sb.Append(",\"storageOwner\":\"").Append(playerStorage ? "player" : "unknown").Append("\"");
      if (playerStorage && money.HasValue) sb.Append(",\"money\":").Append(money.Value);
      if (!playerStorage) goods.Clear();
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
      sb.Append("]");
      if (islandsExtract.SimTime.HasValue) sb.Append(",\"simTime\":").Append(islandsExtract.SimTime.Value);
      if (!string.IsNullOrEmpty(islandsExtract.SnapshotId)) {
        sb.Append(",\"snapshotId\":\"").Append(Esc(islandsExtract.SnapshotId)).Append("\"");
      }
      bool anyPlayerIsland = false;
      foreach (var island in islandsExtract.Islands) if (island.OwnerId == 0) anyPlayerIsland = true;
      if (anyPlayerIsland) sb.Append(",\"playerId\":0");
      sb.Append(",\"islandSnapshots\":[");
      first = true;
      int islandCount = 0;
      foreach (var island in islandsExtract.Islands) {
        if (island.OwnerId != 0) continue;
        if (islandCount >= 40) break;
        islandCount++;
        if (!first) sb.Append(",");
        first = false;
        sb.Append("{\"regionId\":").Append(island.RegionId)
          .Append(",\"areaId\":").Append(island.AreaId)
          .Append(",\"ownerId\":").Append(island.OwnerId)
          .Append(",\"name\":\"").Append(Esc(island.Name)).Append("\"")
          .Append(",\"nameSource\":\"").Append(Esc(island.NameSource)).Append("\"");
        if (island.Stock.Count > 0 && island.Stock.Count <= 24) {
          sb.Append(",\"stock\":[");
          bool firstStock = true;
          foreach (var good in island.Stock) {
            if (!firstStock) sb.Append(",");
            firstStock = false;
            sb.Append("{\"id\":\"").Append(Esc(good.Id)).Append("\",\"name\":\"").Append(Esc(good.Name)).Append("\",\"amount\":").Append(good.Amount).Append("}");
          }
          sb.Append("]");
        }
        if (island.Buildings.Count > 0 && island.Buildings.Count <= 40) {
          sb.Append(",\"buildings\":[");
          bool firstBuilding = true;
          foreach (var building in island.Buildings) {
            if (!firstBuilding) sb.Append(",");
            firstBuilding = false;
            sb.Append("{\"id\":\"").Append(Esc(building.Id)).Append("\",\"name\":\"").Append(Esc(building.Name)).Append("\"");
            if (building.Count > 0) sb.Append(",\"count\":").Append(building.Count);
            sb.Append("}");
          }
          sb.Append("]");
        }
        sb.Append(",\"coverage\":{\"identity\":{\"source\":\"save\"}");
        if (island.Stock.Count > 0 && island.Stock.Count <= 24) sb.Append(",\"stock\":{\"source\":\"save\"}");
        if (island.Buildings.Count > 0 && island.Buildings.Count <= 40) sb.Append(",\"buildings\":{\"source\":\"save\"}");
        sb.Append("}}");
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
    sealed class IslandStock { public string Id; public string Name; public int Amount; }
    sealed class IslandBuilding { public string Id; public string Name; public int Count; }
    sealed class IslandRow {
      public int RegionId;
      public int AreaId;
      public int OwnerId;
      public string Name;
      public string NameSource;
      public readonly List<IslandStock> Stock = new List<IslandStock>();
      public readonly List<IslandBuilding> Buildings = new List<IslandBuilding>();
    }
    sealed class IslandExtract {
      public readonly List<IslandRow> Islands = new List<IslandRow>();
      public long? SimTime;
      public string SnapshotId;
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

    static bool IsNestedFileDb(byte[] bytes) {
      if (bytes == null || bytes.Length < 20) return false;
      return BitConverter.ToUInt32(bytes, bytes.Length - 4) == 0xFFFFFFFD;
    }

    static DbNode FindDescendant(DbNode node, string tag) {
      if (node == null) return null;
      if (node.Tag == tag) return node;
      foreach (var item in node.Children) {
        var hit = FindDescendant(item, tag);
        if (hit != null) return hit;
      }
      return null;
    }

    static int? FindLeafInt(DbNode node, string attr, int depth) {
      if (node == null || depth < 0) return null;
      var direct = LeafInt(node, attr);
      if (direct.HasValue) return direct;
      foreach (var item in node.Children) {
        var hit = FindLeafInt(item, attr, depth - 1);
        if (hit.HasValue) return hit;
      }
      return null;
    }

    static long? AsInt64(byte[] p) {
      if (p == null) return null;
      if (p.Length == 8) return BitConverter.ToInt64(p, 0);
      if (p.Length == 4) return BitConverter.ToInt32(p, 0);
      if (p.Length == 2) return BitConverter.ToUInt16(p, 0);
      return null;
    }

    static long? LeafInt64(DbNode node, string attr) { return AsInt64(Leaf(node, attr)); }

    static long? FindLeafInt64(DbNode node, string attr, int depth) {
      if (node == null || depth < 0) return null;
      var direct = LeafInt64(node, attr);
      if (direct.HasValue) return direct;
      foreach (var item in node.Children) {
        var hit = FindLeafInt64(item, attr, depth - 1);
        if (hit.HasValue) return hit;
      }
      return null;
    }

    static string FindLeafText(DbNode node, string attr, int depth) {
      if (node == null || depth < 0) return null;
      var text = Utf16(Leaf(node, attr));
      if (!string.IsNullOrEmpty(text)) return text;
      foreach (var item in node.Children) {
        var hit = FindLeafText(item, attr, depth - 1);
        if (!string.IsNullOrEmpty(hit)) return hit;
      }
      return null;
    }

    static int? AreaManagerId(string tag) {
      if (string.IsNullOrEmpty(tag) || !tag.StartsWith("AreaManager_")) return null;
      int id;
      if (int.TryParse(tag.Substring("AreaManager_".Length), out id)) return id;
      return null;
    }

    static string NeutralIslandName(int? cityNameGuid, int areaId) {
      if (cityNameGuid.HasValue && cityNameGuid.Value != 0) return "[" + cityNameGuid.Value + "]";
      return "area-" + areaId;
    }

    static void CollectAttr(DbNode node, string attr, List<byte[]> blobs) {
      foreach (var leaf in node.Leaves) {
        if (leaf.Attr == attr && leaf.Bytes != null && leaf.Bytes.Length > 0) blobs.Add(leaf.Bytes);
      }
      foreach (var child in node.Children) CollectAttr(child, attr, blobs);
    }

    static List<IslandStock> StockFromManager(DbNode manager, Dictionary<int, GuidRow> guids) {
      var storage = FindDescendant(manager, "AreaStorageManager");
      if (storage == null) return new List<IslandStock>();
      var blobs = new List<byte[]>();
      CollectAttr(storage, "StrgLrg", blobs);
      if (blobs.Count != 1 || blobs[0] == null || blobs[0].Length % 8 != 0) return new List<IslandStock>();
      var byId = new Dictionary<string, IslandStock>();
      var bytes = blobs[0];
      for (int i = 0; i + 8 <= bytes.Length; i += 8) {
        int g = BitConverter.ToInt32(bytes, i);
        int amt = BitConverter.ToInt32(bytes, i + 4);
        GuidRow row;
        if (!guids.TryGetValue(g, out row) || row.kind != "good") continue;
        if (amt < 0 || byId.ContainsKey(row.id)) return new List<IslandStock>();
        byId[row.id] = new IslandStock { Id = row.id, Name = row.name, Amount = amt };
      }
      return new List<IslandStock>(byId.Values);
    }

    static List<IslandBuilding> BuildingsFromManager(DbNode manager, Dictionary<int, GuidRow> guids) {
      var counts = new Dictionary<string, IslandBuilding>();
      WalkBuildingCounts(manager, guids, counts);
      return new List<IslandBuilding>(counts.Values);
    }

    static void WalkBuildingCounts(DbNode node, Dictionary<int, GuidRow> guids, Dictionary<string, IslandBuilding> counts) {
      bool inCounts = node.Tag == "CountsPerGUID" || (node.Tag != null && node.Tag.EndsWith("CountsPerGUID"));
      if (inCounts) {
        int? pending = null;
        foreach (var leaf in node.Leaves) {
          if (leaf.Bytes != null && leaf.Bytes.Length >= 8 && leaf.Bytes.Length % 8 == 0) {
            for (int i = 0; i + 8 <= leaf.Bytes.Length; i += 8) {
              AddBuildingCount(counts, guids, BitConverter.ToInt32(leaf.Bytes, i), BitConverter.ToInt32(leaf.Bytes, i + 4));
            }
            continue;
          }
          var value = AsI32(leaf.Bytes);
          if (!value.HasValue) continue;
          if (pending == null) pending = value;
          else {
            AddBuildingCount(counts, guids, pending.Value, value.Value);
            pending = null;
          }
        }
      }
      foreach (var child in node.Children) WalkBuildingCounts(child, guids, counts);
    }

    static void AddBuildingCount(Dictionary<string, IslandBuilding> counts, Dictionary<int, GuidRow> guids, int guid, int amount) {
      if (amount <= 0) return;
      GuidRow row;
      if (!guids.TryGetValue(guid, out row) || row.kind != "building") return;
      IslandBuilding prev;
      int next = amount;
      if (counts.TryGetValue(row.id, out prev)) next += prev.Count;
      counts[row.id] = new IslandBuilding { Id = row.id, Name = row.name, Count = next };
    }

    static void ConsiderSimTime(IslandExtract output, long? candidate) {
      if (!candidate.HasValue || candidate.Value <= 0) return;
      if (!output.SimTime.HasValue || candidate.Value > output.SimTime.Value) output.SimTime = candidate;
    }

    static IslandExtract ExtractIslands(byte[] data, Dictionary<int, GuidRow> guids) {
      var output = new IslandExtract();
      var root = ParseTree(data);
      if (root == null) return output;
      var meta = Child(root, "MetaGameManager") ?? root;
      output.SnapshotId = FindLeafText(meta, "SnapshotID", 6) ?? FindLeafText(meta, "SaveGUID", 6);
      var sessions = FindDescendant(root, "GameSessions");
      var sessionNodes = sessions != null ? sessions.Children : new List<DbNode>();
      if (sessionNodes.Count == 0) {
        var only = FindDescendant(root, "GameSessionManager");
        if (only != null) sessionNodes.Add(only);
      }
      foreach (var sessionNode in sessionNodes) {
        var desc = Child(sessionNode, "SessionDesc") ?? sessionNode;
        var regionId = LeafInt(desc, "SessionGUID") ?? LeafInt(sessionNode, "SessionGUID") ?? FindLeafInt(sessionNode, "SessionGUID", 4);
        if (!regionId.HasValue) continue;
        var manager = FindDescendant(sessionNode, "GameSessionManager");
        if (manager == null) continue;
        ConsiderSimTime(output, LeafInt64(manager, "SessionTotalTime"));
        ConsiderSimTime(output, LeafInt64(manager, "GameTime"));
        var areaInfo = Child(manager, "AreaInfo") ?? FindDescendant(manager, "AreaInfo");
        var areaManagers = Child(manager, "AreaManagers") ?? FindDescendant(manager, "AreaManagers");
        var managersByArea = new Dictionary<int, DbNode>();
        if (areaManagers != null) {
          foreach (var mgr in areaManagers.Children) {
            var fromTag = AreaManagerId(mgr.Tag);
            var fromLeaf = LeafInt(mgr, "Identifier") ?? LeafInt(mgr, "AreaID");
            var areaId = fromTag ?? fromLeaf;
            if (areaId.HasValue) managersByArea[areaId.Value] = mgr;
          }
        }
        if (areaInfo == null) continue;
        var idLeaves = new List<int>();
        foreach (var leaf in areaInfo.Leaves) {
          var value = AsI32(leaf.Bytes);
          if (value.HasValue) idLeaves.Add(value.Value);
        }
        for (int i = 0; i < areaInfo.Children.Count; i++) {
          var record = areaInfo.Children[i];
          var owner = Child(record, "Owner");
          var ownerId = owner != null ? LeafInt(owner, "id") : null;
          if (!ownerId.HasValue) continue;
          int? areaId = LeafInt(record, "Identifier") ?? LeafInt(record, "AreaID");
          if (!areaId.HasValue && idLeaves.Count == areaInfo.Children.Count) areaId = idLeaves[i];
          if (!areaId.HasValue) continue;
          var cityName = Utf16(Leaf(record, "CityName"));
          var cityNameGuid = LeafInt(record, "CityNameGuid");
          string name;
          string nameSource;
          if (!string.IsNullOrEmpty(cityName)) { name = cityName; nameSource = "city-name"; }
          else { name = NeutralIslandName(cityNameGuid, areaId.Value); nameSource = "neutral"; }
          var row = new IslandRow {
            RegionId = regionId.Value,
            AreaId = areaId.Value,
            OwnerId = ownerId.Value,
            Name = name,
            NameSource = nameSource
          };
          DbNode managerNode;
          if (ownerId.Value == 0 && managersByArea.TryGetValue(areaId.Value, out managerNode)) {
            foreach (var stock in StockFromManager(managerNode, guids)) row.Stock.Add(stock);
            foreach (var building in BuildingsFromManager(managerNode, guids)) row.Buildings.Add(building);
          }
          output.Islands.Add(row);
        }
      }
      var lastSnapshot = FindLeafInt64(meta, "lastSnapshot", 8);
      if (lastSnapshot.HasValue && lastSnapshot.Value > 0) output.SimTime = lastSnapshot;
      if (!output.SimTime.HasValue) {
        ConsiderSimTime(output, FindLeafInt64(meta, "GameTime", 6));
        ConsiderSimTime(output, FindLeafInt64(meta, "SimulationTime", 6));
        ConsiderSimTime(output, FindLeafInt64(meta, "SessionTime", 6));
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
          if (IsNestedFileDb(payload)) {
            var nested = ParseTree(payload);
            if (nested != null) {
              var wrap = new DbNode { Tag = attr };
              wrap.Children.AddRange(nested.Children);
              wrap.Leaves.AddRange(nested.Leaves);
              stack[stack.Count - 1].Children.Add(wrap);
            }
          }
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
