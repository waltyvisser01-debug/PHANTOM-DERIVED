if (!response.ok || !data.access_token) {
  return res.status(401).json({
    error: "Deriv token exchange failed",
    status: response.status,
    details: data.error_description || data.error || data.message || "No access token returned"
  });
}