const BASE = process.env.VITE_API_URL;

async function req(url, opts = {}) {
  const res = await fetch(BASE + url, opts);

  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ detail: "Network error" }));

    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  health: () => req("/health"),

  meta: () => req("/api/meta"),

  localities: (city) =>
    req(`/api/localities?city=${encodeURIComponent(city)}`),

  predict: (body) =>
    req("/api/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),

  cityMarket: (city) =>
    req(`/api/market/city/${encodeURIComponent(city)}`),

  compareAll: () =>
    req("/api/market/compare"),

  cityTrends: (city) =>
    req(`/api/market/trends/${encodeURIComponent(city)}`),

  rbiHpiAll: () =>
    req("/api/rbi/hpi"),

  rbiHpiCity: (city) =>
    req(`/api/rbi/hpi/${encodeURIComponent(city)}`),
};