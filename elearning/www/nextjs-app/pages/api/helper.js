import axios from "axios";
import { getSession } from "next-auth/react";

const frappeBackendUrl =
  process.env.NEXT_PUBLIC_FRAPPE_URL || "http://math.local:8000";
const API_METHOD_PREFIX = "/api/method/elearning.elearning.doctype."; // Đã sửa lại prefix

export async function fetchWithAuth(path, options = {}) {
  if (!frappeBackendUrl) {
    console.error("Frappe Backend URL is not defined");
    throw new Error("Frappe backend configuration error.");
  }

  let fullPathPrefix = API_METHOD_PREFIX;
  const formattedPath = path.startsWith("/api/method/") // Kiểm tra prefix chung hơn
    ? path
    : `${fullPathPrefix}${path}`;

  console.log(
    `Making API request to: ${formattedPath} with method: ${
      options.method || "GET"
    }`
  );

  // Check if we're already retrying to prevent infinite loops
  const isRetry = options.isRetry || false;

  try {
    let accessToken = null;
    if (typeof window !== "undefined") {
      const session = await getSession();
      accessToken = session?.accessToken;
      if (!accessToken) {
        console.warn("fetchWithAuth: No JWT token available in session");
      }
    }

    const headers = {
      Accept: "application/json",
      ...(options.headers || {}),
    };

    let dataToSend = options.body;

    if (options.body instanceof FormData) {
      console.log(
        "fetchWithAuth: Body is FormData. Deleting Content-Type header to let browser set it."
      );
      delete headers["Content-Type"];
      // dataToSend giữ nguyên là options.body (FormData object)
    } else if (options.body && typeof options.body === "object") {
      // Nếu body là object và không phải FormData, đảm bảo nó được stringify và Content-Type là JSON
      console.log(
        "fetchWithAuth: Body is an object (not FormData). Stringifying and setting Content-Type to application/json."
      );
      if (
        !headers["Content-Type"] ||
        headers["Content-Type"].toLowerCase() !== "application/json"
      ) {
        headers["Content-Type"] = "application/json;charset=UTF-8";
      }
      dataToSend = JSON.stringify(options.body); // Stringify một cách tường minh
    } else if (typeof options.body === "string") {
      // Nếu body đã là string, giả sử nó là JSON string nếu Content-Type chưa được đặt hoặc là JSON
      console.log(
        "fetchWithAuth: Body is a string. Assuming JSON if Content-Type is not set or is application/json."
      );
      if (
        !headers["Content-Type"] ||
        headers["Content-Type"].toLowerCase().includes("application/json")
      ) {
        if (!headers["Content-Type"]) {
          // Chỉ đặt nếu chưa có
          headers["Content-Type"] = "application/json;charset=UTF-8";
        }
        // dataToSend giữ nguyên là options.body (string)
      }
    } else {
      // Không có body hoặc body không phải object/FormData/string
      // Xóa Content-Type nếu không có body (ví dụ cho GET)
      if (!options.body) {
        delete headers["Content-Type"];
      }
      console.log(
        "fetchWithAuth: No specific body processing for this type or no body."
      );
    }

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    console.log("fetchWithAuth: Final headers:", JSON.stringify(headers));
    // console.log("fetchWithAuth: Data to send:", dataToSend); // Cẩn thận khi log base64

    const response = await axios({
      baseURL: frappeBackendUrl,
      url: formattedPath,
      method: options.method || "GET",
      headers,
      params: options.params || undefined,
      data: dataToSend,
      timeout: options.timeout || 60000, // Tăng timeout lên 60s cho các request có thể lớn
      withCredentials: false,
    });

    console.log(
      "API request successful, status:",
      response.status,
      "Path:",
      formattedPath
    );
    return response.data;
  } catch (error) {
    console.error(
      `API Request Error for path ${formattedPath}:`,
      error.message
    );

    if (error.response) {
      console.error("Error Response Details:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });

      // Handle 401 Unauthorized error which may indicate session loss after server restart
      if (error.response.status === 401 && !isRetry) {
        console.log("Received 401 Unauthorized - This might be due to session loss after server restart");
        
        // Make a special request to regenerate session from JWT
        try {
          console.log("Attempting to regenerate session from JWT token");
          // Make a request to trigger the regenerate_session_from_jwt function
          const session = await getSession();
          if (session?.accessToken) {
            await axios({
              baseURL: frappeBackendUrl,
              url: "/api/method/elearning.api.jwt_auth.get_user_info",
              method: "GET",
              headers: {
                "Authorization": `Bearer ${session.accessToken}`,
                "X-Regenerate-Session": "true"
              },
              timeout: 10000,
            });
            
            console.log("Session regeneration attempt complete, retrying original request");
            
            // Retry the original request with a flag to prevent infinite loops
            return fetchWithAuth(path, {
              ...options,
              isRetry: true
            });
          }
        } catch (regenerateError) {
          console.error("Failed to regenerate session:", regenerateError);
        }
      }

      let errorMessage = `Request failed with status ${error.response.status}: ${error.response.statusText}`;
      if (
        typeof error.response.data === "string" &&
        error.response.data.toLowerCase().includes("<html")
      ) {
        errorMessage = `Server returned an HTML error page (Status: ${error.response.status}). Check Nginx/server logs.`;
      } else if (error.response.data) {
        errorMessage =
          error.response.data._server_messages ||
          error.response.data._error_message ||
          error.response.data.message ||
          errorMessage;
      }

      const customError = new Error(errorMessage);
      customError.status = error.response.status;
      customError.data = error.response.data;
      throw customError;
    } else if (error.request) {
      console.error(
        "Error Request Data (no response received for " + formattedPath + "):",
        error.request
      );
      throw new Error(
        `No response received from server for ${formattedPath}. Check network or server status.`
      );
    } else {
      console.error(
        "Error Setting Up Request for " + formattedPath + ":",
        error.message
      );
      throw new Error(
        `Error setting up request for ${formattedPath}: ${error.message}`
      );
    }
  }
}

// Bắt đầu phiên học Flashcard mới
export async function startFlashcardSession(topicId, mode = "Basic") {
  return fetchWithAuth(`flashcard_session.flashcard_session.start_flashcard_session`, {
    method: "POST",
    body: JSON.stringify({
      topic_id: topicId,
      mode: mode
    })
  });
}

// Cập nhật thời gian phiên học Flashcard
export async function updateFlashcardSessionTime(sessionId, timeSpentSeconds) {
  return fetchWithAuth(`flashcard_session.flashcard_session.update_flashcard_session_time`, {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      time_spent_seconds: timeSpentSeconds
    })
  });
}

// Kết thúc phiên học Flashcard
export async function endFlashcardSession(sessionId) {
  return fetchWithAuth(`flashcard_session.flashcard_session.end_flashcard_session`, {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId
    })
  });
}