import commonAPI from "./commonAPI";
import serverURL from "./serverURL";

// ====== BOOKING APIs ======

// Add booking
export const addBookingAPI = async (bookingData) => {
  try {
    const response = await commonAPI("POST", `${serverURL}/api/bookings`, bookingData, {
      "Content-Type": "application/json"
    });
    if (response.status === 201 || response.status === 200) {
      return response;
    } else {
      throw new Error(response.response?.data?.message || "Failed to add booking");
    }
  } catch (err) {
    console.error("Error adding booking:", err);
    return { status: 500, error: err.message };
  }
};

// Get all bookings
export const getBookingsAPI = async () => {
  try {
    const response = await commonAPI("GET", `${serverURL}/api/bookings`, "", {
      "Content-Type": "application/json"
    });
    if (response.status === 200) {
      return response;
    } else {
      throw new Error(response.response?.data?.message || "Failed to fetch bookings");
    }
  } catch (err) {
    console.error("Error fetching bookings:", err);
    return { status: 500, error: err.message };
  }
};

// Get booking by ID
export const getBookingByIdAPI = async (id) => {
  try {
    const response = await commonAPI("GET", `${serverURL}/api/bookings/${id}`, "", {
      "Content-Type": "application/json"
    });
    if (response.status === 200) {
      return response;
    } else {
      throw new Error(response.response?.data?.message || "Failed to fetch booking");
    }
  } catch (err) {
    console.error("Error fetching booking:", err);
    return { status: 500, error: err.message };
  }
};

// Update booking
export const updateBookingAPI = async (id, bookingData) => {
  try {
    const response = await commonAPI("PUT", `${serverURL}/api/bookings/${id}`, bookingData, {
      "Content-Type": "application/json"
    });
    if (response.status === 200) {
      return response;
    } else {
      throw new Error(response.response?.data?.message || "Failed to update booking");
    }
  } catch (err) {
    console.error("Error updating booking:", err);
    return { status: 500, error: err.message };
  }
};

// Delete booking
export const deleteBookingAPI = async (id) => {
  try {
    const response = await commonAPI("DELETE", `${serverURL}/api/bookings/${id}`, "", {
      "Content-Type": "application/json"
    });
    if (response.status === 200) {
      return response;
    } else {
      throw new Error(response.response?.data?.message || "Failed to delete booking");
    }
  } catch (err) {
    console.error("Error deleting booking:", err);
    return { status: 500, error: err.message };
  }
};

// ====== Additional APIs can be added below ======

// ====== AUTH APIs ======

// Register new user
export const registerAPI = async (userData) => {
  try {
    const response = await commonAPI("POST", `${serverURL}/api/register`, userData, {
      "Content-Type": "application/json"
    });
    if (response.status === 201 || response.status === 200) {
      return response;
    } else {
      throw new Error(response.response?.data?.message || "Registration failed");
    }
  } catch (err) {
    console.error("Error during registration:", err);
    return err;
  }
};

// User login
export const userLoginAPI = async (credentials) => {
  try {
    const response = await commonAPI("POST", `${serverURL}/api/user/login`, credentials, {
      "Content-Type": "application/json"
    });
    if (response.status === 200) {
      return response;
    } else {
      throw new Error(response.response?.data?.message || "Login failed");
    }
  } catch (err) {
    console.error("Error during user login:", err);
    return err;
  }
};

// Admin login
export const adminLoginAPI = async (credentials) => {
  try {
    const response = await commonAPI("POST", `${serverURL}/api/admin/login`, credentials, {
      "Content-Type": "application/json"
    });
    if (response.status === 200) {
      return response;
    } else {
      throw new Error(response.response?.data?.message || "Admin login failed");
    }
  } catch (err) {
    console.error("Error during admin login:", err);
    return err;
  }
};