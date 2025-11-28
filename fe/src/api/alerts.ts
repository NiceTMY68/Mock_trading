import apiClient from './client';

export interface Alert {
  id: number;
  symbol: string;
  condition: 'above' | 'below' | 'percent_change_up' | 'percent_change_down';
  targetValue: number;
  isActive: boolean;
  notes?: string;
  triggeredAt?: string;
  triggeredPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertRequest {
  symbol: string;
  condition: 'above' | 'below' | 'percent_change_up' | 'percent_change_down';
  targetValue: number;
  notes?: string;
}

export interface UpdateAlertRequest {
  condition?: 'above' | 'below' | 'percent_change_up' | 'percent_change_down';
  targetValue?: number;
  isActive?: boolean;
  notes?: string;
}

/**
 * Get all alerts for current user
 */
export const getAlerts = async (includeInactive = false): Promise<Alert[]> => {
  const response = await apiClient.get('/alerts', {
    params: { includeInactive }
  });
  return response.data.data.alerts;
};

/**
 * Get alert by ID
 */
export const getAlert = async (id: number): Promise<Alert> => {
  const response = await apiClient.get(`/alerts/${id}`);
  return response.data.data.alert;
};

/**
 * Create new alert
 */
export const createAlert = async (data: CreateAlertRequest): Promise<Alert> => {
  const response = await apiClient.post('/alerts', data);
  return response.data.data.alert;
};

/**
 * Update alert
 */
export const updateAlert = async (id: number, data: UpdateAlertRequest): Promise<Alert> => {
  const response = await apiClient.put(`/alerts/${id}`, data);
  return response.data.data.alert;
};

/**
 * Delete alert
 */
export const deleteAlert = async (id: number): Promise<void> => {
  await apiClient.delete(`/alerts/${id}`);
};

/**
 * Get alert history (triggered alerts)
 */
export const getAlertHistory = async (limit = 50): Promise<Alert[]> => {
  const response = await apiClient.get('/alerts/history', {
    params: { limit }
  });
  return response.data.data.history;
};

