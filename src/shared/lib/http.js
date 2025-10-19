const BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers||{}) },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error || "Error");
  return res.json();
}

export default {
  get: (p) => req(p),
  post: (p, body) => req(p, { method: "POST", body }),
  del: (p) => req(p, { method: "DELETE" }),
};
