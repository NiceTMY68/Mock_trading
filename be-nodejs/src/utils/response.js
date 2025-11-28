export function createResponse(success, message, data = null) {
  const response = {
    success,
    message
  };

  if (data !== null) {
    response.data = data;
  }

  return response;
}

export function successResponse(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data
  });
}

export function errorResponse(res, error, statusCode = 500) {
  return res.status(statusCode).json({
    success: false,
    error: error.message || error
  });
}

export function paginatedResponse(res, items, page, size, total) {
  return res.json({
    success: true,
    data: items,
    pagination: {
      page: parseInt(page),
      limit: parseInt(size),
      total: parseInt(total),
      pages: Math.ceil(total / size)
    }
  });
}
