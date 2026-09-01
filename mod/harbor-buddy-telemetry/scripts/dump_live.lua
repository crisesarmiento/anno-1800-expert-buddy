-- Harbor Buddy telemetry dump (v0.1.1)
-- Intended hook later: timer / console / ts.Quests.
-- MUST NOT run on load. dump() at require-time crashes some loaders.
-- Writes ONLY harbor-live-v1 JSON. Never invents titles.
-- If nothing is readable, writes quests: [].

local SCHEMA = "harbor-live-v1"
local GAME = "anno-1800"

local function json_escape(text)
  local value = tostring(text or "")
  value = value:gsub("\\", "\\\\")
  value = value:gsub("\"", "\\\"")
  value = value:gsub("\n", "\\n")
  value = value:gsub("\r", "\\r")
  return value
end

local function iso_now()
  if os and os.date then
    return os.date("!%Y-%m-%dT%H:%M:%SZ")
  end
  return "1970-01-01T00:00:00Z"
end

local function output_path()
  local home = os and os.getenv and (os.getenv("USERPROFILE") or os.getenv("HOME"))
  if type(home) == "string" and home ~= "" then
    return home .. "\\Documents\\Anno 1800\\harbor-live.json"
  end
  return "harbor-live.json"
end

local function quest_state(entry)
  if type(entry) ~= "table" then
    return "active"
  end
  if entry.Ready == true or entry.ready == true then
    return "ready"
  end
  if entry.Done == true or entry.Completed == true or entry.done == true then
    return "done"
  end
  return "active"
end

local function quest_title(entry)
  if type(entry) == "string" then
    return entry
  end
  if type(entry) ~= "table" then
    return nil
  end
  local title = entry.Title or entry.title or entry.Name or entry.name
  if type(title) == "string" and title ~= "" then
    return title
  end
  return nil
end

local function collect_quests()
  local quests = {}
  if type(ts) ~= "table" or type(ts.Quests) ~= "table" then
    return quests
  end

  local pool = ts.Quests
  if type(ts.Quests.GetQuests) == "function" then
    local ok, result = pcall(function()
      return ts.Quests:GetQuests()
    end)
    if ok then
      pool = result
    end
  elseif type(ts.Quests.Active) == "table" then
    pool = ts.Quests.Active
  elseif type(ts.Quests.active) == "table" then
    pool = ts.Quests.active
  end

  if type(pool) ~= "table" then
    return quests
  end

  for _, entry in pairs(pool) do
    local title = quest_title(entry)
    if title then
      local item = {
        title = title,
        state = quest_state(entry),
      }
      local objective = type(entry) == "table" and (entry.Objective or entry.objective or entry.Text)
      if type(objective) == "string" and objective ~= "" then
        item.objective = objective
      end
      quests[#quests + 1] = item
    end
  end
  return quests
end

local function encode(snapshot)
  local quests_json = {}
  for i = 1, #snapshot.quests do
    local q = snapshot.quests[i]
    local chunk = '{"title":"' .. json_escape(q.title) .. '","state":"' .. json_escape(q.state) .. '"'
    if q.objective then
      chunk = chunk .. ',"objective":"' .. json_escape(q.objective) .. '"'
    end
    chunk = chunk .. "}"
    quests_json[#quests_json + 1] = chunk
  end
  return table.concat({
    '{"schema":"' .. SCHEMA .. '"',
    '"source":"telemetry"',
    '"updatedAt":"' .. json_escape(snapshot.updatedAt) .. '"',
    '"game":"' .. GAME .. '"',
    '"quests":[' .. table.concat(quests_json, ",") .. "]}",
  }, ",")
end

local function dump()
  local snapshot = {
    updatedAt = iso_now(),
    quests = collect_quests(),
  }
  if not io or not io.open then
    return
  end
  local handle = io.open(output_path(), "w")
  if not handle then
    return
  end
  handle:write(encode(snapshot))
  handle:write("\n")
  handle:close()
end

local function safe_dump()
  pcall(dump)
end

-- Intentionally no dump() here.

return {
  dump = safe_dump,
}
