import axios from "axios";

const api = axios.create({
  baseURL: "",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let _refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // Пробуем обновить токен один раз при 401
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;

      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        _redirectToLogin();
        return Promise.reject(err);
      }

      try {
        if (!_refreshing) {
          _refreshing = axios
            .post("/auth/refresh", { refresh_token: refreshToken })
            .then((r) => {
              const { access_token, refresh_token } = r.data;
              localStorage.setItem("access_token", access_token);
              localStorage.setItem("refresh_token", refresh_token);
              return access_token;
            })
            .finally(() => { _refreshing = null; });
        }

        const newAccess = await _refreshing;
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch {
        _redirectToLogin();
        return Promise.reject(err);
      }
    }

    return Promise.reject(err);
  }
);

function _redirectToLogin() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.href = "/login";
}

export default api;
