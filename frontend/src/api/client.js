const client = async (endpoint, { body, ...customConfig } = {}) => {
  const token = localStorage.getItem('dayflow_token');
  const headers = {};
  
  // Only set application/json if we are not uploading a file (multipart/form-data)
  // When uploading files, fetch automatically sets correct boundary headers if body is a FormData object.
  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    method: body ? 'POST' : 'GET',
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
    },
  };

  if (body) {
    config.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(endpoint, config);

    // 401 Unauthorized handling
    if (response.status === 401) {
      localStorage.removeItem('dayflow_token');
      // Only redirect if we are not already on the login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.detail || 'An unexpected error occurred.');
      error.status = response.status;
      return Promise.reject(error);
    }

    // Handle CSV or Blob response
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('text/csv') || contentType.includes('application/octet-stream'))) {
      return response.blob();
    }

    // Default JSON parse
    return response.json().catch(() => ({}));
  } catch (err) {
    return Promise.reject(err);
  }
};

export const apiClient = {
  get: (url, config) => client(url, { ...config, method: 'GET' }),
  post: (url, body, config) => client(url, { ...config, body, method: 'POST' }),
  put: (url, body, config) => client(url, { ...config, body, method: 'PUT' }),
  patch: (url, body, config) => client(url, { ...config, body, method: 'PATCH' }),
  delete: (url, config) => client(url, { ...config, method: 'DELETE' }),
};
export default apiClient;
