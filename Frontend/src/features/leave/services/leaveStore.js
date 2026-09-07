import apiClient from "@/api/apiClient.js";

// Note: Ensure the base endpoint path correctly resolves to /api/v1
// apiClient handles baseUrl and auth headers automatically.

const getAuthHeaders = () => { /* Not needed since apiClient handles it */ };

const mapLeaveType = (type) => {
    switch(type) {
        case 1: return "Casual Leave";
        case 2: return "Sick Leave";
        case 3: return "Earned Leave";
        case 4: return "Maternity Leave";
        case 5: return "Other";
        default: return type;
    }
};

const mapLeaveStatus = (status) => {
    switch(status) {
        case 1: return "Pending";
        case 2: return "Approved";
        case 3: return "Rejected";
        default: return status;
    }
};

const mapLeaveRequest = (req) => {
    if (!req) return req;
    return {
        ...req,
        leaveType: mapLeaveType(req.leaveType),
        status: mapLeaveStatus(req.status),
        fromDate: req.startDate ? req.startDate.split('T')[0] : null,
        toDate: req.endDate ? req.endDate.split('T')[0] : null,
        days: req.totalDays
    };
};

export const getLeaveRequests = async (staffId = null, departmentId = null, status = null) => {
    try {
        const params = new URLSearchParams();
        if (staffId) params.append('staffId', staffId);
        if (departmentId) params.append('departmentId', departmentId);
        if (status) params.append('status', status);

        const response = await apiClient.get(`/api/v1/staff-attendance/leave?${params.toString()}`);
        const data = response.data?.data || response.data?.Data || [];
        return data.map(mapLeaveRequest);
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        throw error;
    }
};

export const getLeaveDetails = async (leaveRequestId) => {
    try {
        const response = await apiClient.get(`/api/v1/staff-attendance/leave/${leaveRequestId}`);
        const data = response.data?.data || response.data?.Data;
        return mapLeaveRequest(data);
    } catch (error) {
        console.error(`Error fetching leave details for ID ${leaveRequestId}:`, error);
        throw error;
    }
};

export const submitLeaveRequest = async (requestPayload) => {
    try {
        const response = await apiClient.post(`/api/v1/staff-attendance/leave`, requestPayload);
        return response.data?.data || response.data?.Data;
    } catch (error) {
        console.error('Error submitting leave request:', error);
        throw error;
    }
};

export const reviewLeaveRequest = async (leaveRequestId, actionPayload) => {
    try {
        const response = await apiClient.post(`/api/v1/staff-attendance/leave/${leaveRequestId}/action`, actionPayload);
        const data = response.data?.data || response.data?.Data;
        return mapLeaveRequest(data);
    } catch (error) {
        console.error(`Error reviewing leave request ID ${leaveRequestId}:`, error);
        throw error;
    }
};

export const revokeApprovedLeave = async (leaveRequestId, adminRemark) => {
    return reviewLeaveRequest(leaveRequestId, {
        status: 3, // 3 mapped to Rejected in Enum
        rejectionReason: adminRemark
    });
};

export const getLeaveHistorySummary = async (departmentId = null, staffType = null) => {
    try {
        const params = new URLSearchParams();
        if (departmentId) params.append('departmentId', departmentId);
        if (staffType) params.append('staffType', staffType);

        const response = await apiClient.get(`/api/v1/staff-attendance/leave/history?${params.toString()}`);
        return response.data?.data || response.data?.Data || [];
    } catch (error) {
        console.error('Error fetching leave history summary:', error);
        throw error;
    }
};

export const getLeaveHistory = async (staffId) => {
    try {
        const response = await apiClient.get(`/api/v1/staff-attendance/leave/history/staff/${staffId}`);
        return response.data?.data || response.data?.Data;
    } catch (error) {
        console.error(`Error fetching leave history for staff ID ${staffId}:`, error);
        throw error;
    }
};

export const getAffectedClasses = async (leaveRequestId) => {
    try {
        const response = await apiClient.get(`/api/v1/staff-leaves/${leaveRequestId}/affected-classes`);
        return response.data?.data || response.data?.Data || [];
    } catch (error) {
        console.error(`Error fetching affected classes for leave ID ${leaveRequestId}:`, error);
        throw error;
    }
};

export const getEligibleSubstitutes = async (leaveRequestId, timetableId, date) => {
    try {
        const params = new URLSearchParams({ date });
        const response = await apiClient.get(`/api/v1/staff-leaves/${leaveRequestId}/slots/${timetableId}/eligible-substitutes?${params.toString()}`);
        return response.data?.data || response.data?.Data || [];
    } catch (error) {
        console.error('Error fetching eligible substitutes:', error);
        throw error;
    }
};

export const assignSubstitutes = async (leaveRequestId, requestPayload) => {
    try {
        const response = await apiClient.post(`/api/v1/staff-leaves/${leaveRequestId}/substitutions`, requestPayload);
        return response.data?.data || response.data?.Data || [];
    } catch (error) {
        console.error('Error assigning substitutes:', error);
        throw error;
    }
};
