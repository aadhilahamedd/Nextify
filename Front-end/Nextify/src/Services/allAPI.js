import commonAPI from "./commonAPI";
import serverURL from "./serverURL";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const unwrap = (response) => {
  if (response?.data?.success && response.data.data !== undefined) {
    return { ...response, data: response.data.data, message: response.data.message };
  }
  return response;
};

const handleError = (err, fallback) => ({
  status: err?.response?.status || 500,
  error: err?.response?.data?.message || err?.message || fallback,
  data: err?.response?.data,
});

// ====== CONTACT ======
export const submitContactMessageAPI = async (messageData) => {
  try {
    const response = await commonAPI("POST", `${serverURL}/api/messages`, messageData, { "Content-Type": "application/json" });
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Failed to send message");
  }
};

export const getContactMessagesAPI = async () => {
  try {
    const response = await commonAPI("GET", `${serverURL}/api/messages`, "", getAuthHeaders());
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Failed to fetch messages");
  }
};

export const markMessageReadAPI = async (id) => {
  try {
    return await commonAPI("PATCH", `${serverURL}/api/messages/${id}/read`, {}, getAuthHeaders());
  } catch (err) {
    return handleError(err, "Failed to update message");
  }
};

export const deleteContactMessageAPI = async (id) => {
  try {
    return await commonAPI("DELETE", `${serverURL}/api/messages/${id}`, "", getAuthHeaders());
  } catch (err) {
    return handleError(err, "Failed to delete message");
  }
};

// ====== BOOKINGS ======
export const createBookingAPI = async (bookingData) => {
  try {
    const response = await commonAPI("POST", `${serverURL}/api/bookings`, bookingData, getAuthHeaders());
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Failed to create booking");
  }
};

export const addBookingAPI = createBookingAPI;

export const getBookingsAPI = async () => {
  try {
    const response = await commonAPI("GET", `${serverURL}/api/bookings`, "", getAuthHeaders());
    const unwrapped = unwrap(response);
    if (unwrapped.status === 200 && unwrapped.data?.bookings) {
      return { ...unwrapped, data: unwrapped.data.bookings };
    }
    return unwrapped;
  } catch (err) {
    return handleError(err, "Failed to fetch bookings");
  }
};

export const getBookingStatsAPI = async () => {
  try {
    const response = await commonAPI("GET", `${serverURL}/api/bookings/stats`, "", getAuthHeaders());
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Failed to fetch stats");
  }
};

export const getBookingByIdAPI = async (id) => {
  try {
    const response = await commonAPI("GET", `${serverURL}/api/bookings/${id}`, "", getAuthHeaders());
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Failed to fetch booking");
  }
};

export const trackBookingAPI = async (bookingNumber, { email, mobile }) => {
  try {
    const params = new URLSearchParams();
    if (email) params.set("email", email);
    if (mobile) params.set("mobile", mobile);
    const response = await commonAPI("GET", `${serverURL}/api/bookings/track/${bookingNumber}?${params}`, "");
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Booking not found");
  }
};

export const updateBookingAPI = async (id, bookingData) => {
  try {
    const response = await commonAPI("PUT", `${serverURL}/api/bookings/${id}`, bookingData, getAuthHeaders());
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Failed to update booking");
  }
};

export const assignDriverAPI = async (bookingId, driverId) => {
  try {
    const response = await commonAPI("POST", `${serverURL}/api/bookings/${bookingId}/assign-driver`, { driverId }, getAuthHeaders());
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Failed to assign driver");
  }
};

export const deleteBookingAPI = async (id) => {
  try {
    return await commonAPI("DELETE", `${serverURL}/api/bookings/${id}`, "", getAuthHeaders());
  } catch (err) {
    return handleError(err, "Failed to delete booking");
  }
};

// ====== PRICING ======
export const calculatePriceAPI = async (payload) => {
  try {
    const response = await commonAPI("POST", `${serverURL}/api/pricing/calculate`, payload, { "Content-Type": "application/json" });
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Price calculation failed");
  }
};

export const getPricingSummaryAPI = async () => {
  try {
    const response = await commonAPI("GET", `${serverURL}/api/pricing/summary`, "");
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Failed to fetch pricing summary");
  }
};

export const getPricingRulesAPI = async ({ serviceType, search } = {}) => {
  try {
    const params = new URLSearchParams();
    if (serviceType) params.set("serviceType", serviceType);
    if (search) params.set("search", search);
    const qs = params.toString();
    const response = await commonAPI(
      "GET",
      `${serverURL}/api/pricing${qs ? `?${qs}` : ""}`,
      "",
      getAuthHeaders()
    );
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Failed to fetch pricing rules");
  }
};

export const createPricingRuleAPI = async (ruleData) => {
  try {
    const response = await commonAPI("POST", `${serverURL}/api/pricing`, ruleData, getAuthHeaders());
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Failed to create pricing rule");
  }
};

export const updatePricingRuleAPI = async (id, ruleData) => {
  try {
    const response = await commonAPI("PUT", `${serverURL}/api/pricing/${id}`, ruleData, getAuthHeaders());
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Failed to update pricing rule");
  }
};

export const deletePricingRuleAPI = async (id) => {
  try {
    const response = await commonAPI("DELETE", `${serverURL}/api/pricing/${id}`, "", getAuthHeaders());
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Failed to delete pricing rule");
  }
};

export const getAirportRoutesAPI = async () => {
  try {
    const response = await commonAPI("GET", `${serverURL}/api/airport-routes`, "");
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Failed to fetch airport routes");
  }
};

// ====== PAYMENTS ======
export const createPaymentAPI = async (bookingId) => {
  try {
    const response = await commonAPI("POST", `${serverURL}/api/payments/create`, { bookingId }, getAuthHeaders());
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Failed to create payment");
  }
};

export const mockCompletePaymentAPI = async (paymentId) => {
  try {
    const response = await commonAPI("POST", `${serverURL}/api/payments/mock/complete`, { paymentId }, { "Content-Type": "application/json" });
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Payment completion failed");
  }
};

export const mockFailPaymentAPI = async (paymentId) => {
  try {
    const response = await commonAPI("POST", `${serverURL}/api/payments/mock/fail`, { paymentId }, { "Content-Type": "application/json" });
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Payment failure update failed");
  }
};

export const getPaymentsAPI = async () => {
  try {
    const response = await commonAPI("GET", `${serverURL}/api/payments`, "", getAuthHeaders());
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Failed to fetch payments");
  }
};

// ====== DRIVERS ======
export const getDriversAPI = async () => {
  try {
    const response = await commonAPI("GET", `${serverURL}/api/drivers`, "", getAuthHeaders());
    const unwrapped = unwrap(response);
    if (unwrapped.status === 200 && unwrapped.data?.drivers) {
      return { ...unwrapped, data: unwrapped.data.drivers };
    }
    return unwrapped;
  } catch (err) {
    return handleError(err, "Failed to fetch drivers");
  }
};

export const createDriverAPI = async (driverData) => {
  try {
    const response = await commonAPI("POST", `${serverURL}/api/drivers`, driverData, getAuthHeaders());
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Failed to create driver");
  }
};

export const updateDriverAPI = async (id, driverData) => {
  try {
    const response = await commonAPI("PUT", `${serverURL}/api/drivers/${id}`, driverData, getAuthHeaders());
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Failed to update driver");
  }
};

export const deleteDriverAPI = async (id) => {
  try {
    return await commonAPI("DELETE", `${serverURL}/api/drivers/${id}`, "", getAuthHeaders());
  } catch (err) {
    return handleError(err, "Failed to delete driver");
  }
};

// ====== CHAT ======
export const sendChatMessageAPI = async (payload) => {
  try {
    const response = await commonAPI("POST", `${serverURL}/api/chat`, payload, { "Content-Type": "application/json" });
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Chat unavailable");
  }
};

// ====== AUTH ======
export const registerAPI = async (userData) => {
  try {
    const response = await commonAPI("POST", `${serverURL}/api/register`, userData, { "Content-Type": "application/json" });
    return unwrap(response);
  } catch (err) {
    return handleError(err, "Registration failed");
  }
};

export const userLoginAPI = async (credentials) => {
  try {
    const response = await commonAPI("POST", `${serverURL}/api/user/login`, credentials, { "Content-Type": "application/json" });
    const unwrapped = unwrap(response);
    if (unwrapped.status === 200 && unwrapped.data?.token) {
      return { ...unwrapped, data: { token: unwrapped.data.token, user: unwrapped.data.user } };
    }
    return unwrapped;
  } catch (err) {
    return handleError(err, "Login failed");
  }
};

export const adminLoginAPI = userLoginAPI;

// ====== CARS ======
export const getCarsAPI = async () => {
  try {
    const response = await commonAPI("GET", `${serverURL}/api/cars`, "");
    if (response.status === 200) return response;
    return handleError({ response }, "Failed to fetch cars");
  } catch (err) {
    return handleError(err, "Failed to fetch cars");
  }
};

export const addCarAPI = async (carData) => {
  try {
    return await commonAPI("POST", `${serverURL}/api/cars`, carData, getAuthHeaders());
  } catch (err) {
    return handleError(err, "Failed to add car");
  }
};

export const updateCarAPI = async (id, carData) => {
  try {
    return await commonAPI("PUT", `${serverURL}/api/cars/${id}`, carData, getAuthHeaders());
  } catch (err) {
    return handleError(err, "Failed to update car");
  }
};

export const deleteCarAPI = async (id) => {
  try {
    return await commonAPI("DELETE", `${serverURL}/api/cars/${id}`, "", getAuthHeaders());
  } catch (err) {
    return handleError(err, "Failed to delete car");
  }
};
