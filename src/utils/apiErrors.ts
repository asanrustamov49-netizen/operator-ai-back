interface IApiErrors {
  badRequest: (message?: string) => IResponse;
  unauthorized: (message?: string) => IResponse;
  noContent: (message?: string) => IResponse;
  forbidden: (message?: string) => IResponse;
  notFound: (message?: string) => IResponse;
  conflict: (message?: string) => IResponse;
  unprocessableEntity: (message?: string) => IResponse;
  tooManyRequests: (message?: string) => IResponse;
  internalServerError: (message?: string) => IResponse;
  serviceUnavailable: (message?: string) => IResponse;
}

interface IResponse {
  message: string;
  status: number;
}

export const apiErrors: IApiErrors = {
  badRequest: (message = "Bad Request") => ({
    status: 400,
    message,
  }),

  unauthorized: (message = "Unauthorized") => ({
    status: 401,
    message,
  }),

  noContent: (message = "No Content") => ({
    status: 402,
    message,
  }),

  forbidden: (message = "Forbidden") => ({
    status: 403,
    message,
  }),

  notFound: (message = "Not Found") => ({
    status: 404,
    message,
  }),

  conflict: (message = "Conflict") => ({
    status: 409,
    message,
  }),

  unprocessableEntity: (message = "Unprocessable Entity") => ({
    status: 422,
    message,
  }),

  tooManyRequests: (message = "Too Many Requests") => ({
    status: 429,
    message,
  }),

  internalServerError: (message = "Internal Server Error") => ({
    status: 500,
    message,
  }),

  serviceUnavailable: (message = "Service Unavailable") => ({
    status: 503,
    message,
  }),
};
