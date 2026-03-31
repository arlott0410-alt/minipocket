import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function Admin() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({});
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("settings");
  useEffect(() => {
    Promise.all([api.adminGetSettings(), api.adminGetUsers()])
      .then(([s, u]) => {
        setSettings(Object.fromEntries((s.settings || []).map((x) => [x.key, x.value])));
        setUsers(u.users || []);
      })
      .catch(() => navigate("/"));
  }, [navigate]);
  const save = async () => api.adminSaveSettings(settings);
  return (
    <div className="pb-24 pt-4 px-4 space-y-3">
      <h1 className="text-xl font-bold">Admin</h1>
      <div className="flex gap-2">
        <button className="px-3 py-1 rounded-full bg-indigo-600 text-white" onClick={() => setTab("settings")}>Settings</button>
        <button className="px-3 py-1 rounded-full bg-gray-200" onClick={() => setTab("users")}>Users</button>
      </div>
      {tab === "settings" ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 space-y-2">
          {Object.entries(settings).map(([key, value]) => (
            <div key={key}>
              <label className="text-xs">{key}</label>
              <input className="w-full border rounded-xl px-3 py-2" value={value} onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))} />
            </div>
          ))}
          <button className="w-full rounded-xl bg-indigo-600 text-white py-2" onClick={save}>Save</button>
        </div>
      ) : (
        <div className="space-y-2">{users.map((u) => <div key={u.id} className="bg-white dark:bg-gray-800 rounded-xl p-3 text-sm">{u.first_name} @{u.username || u.telegram_id}</div>)}</div>
      )}
    </div>
  );
}
