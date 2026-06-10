import type { AxiosResponse } from 'axios';
import { managementApi } from './client';
import type { CTV, CTVCreateData, CTVStats, CTVFilterEmployee, Doctor } from './types';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CTVListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  work_type?: string;
  leader_id?: number;
  staff_id?: number;
  doctor?: number;
  ordering?: string;
}

export const ctvAPI = {
  list: async (params?: CTVListParams): Promise<PaginatedResponse<CTV>> => {
    const response: AxiosResponse<PaginatedResponse<CTV>> = await managementApi.get(
      '/api-hrm/ctv/',
      { params }
    );
    return response.data;
  },

  getById: async (id: number): Promise<CTV> => {
    const response: AxiosResponse<CTV> = await managementApi.get(`/api-hrm/ctv/${id}/`);
    return response.data;
  },

  create: async (data: FormData): Promise<CTV> => {
    const response: AxiosResponse<CTV> = await managementApi.post('/api-hrm/ctv/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  update: async (id: number, data: FormData): Promise<CTV> => {
    const response: AxiosResponse<CTV> = await managementApi.patch(`/api-hrm/ctv/${id}/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await managementApi.delete(`/api-hrm/ctv/${id}/`);
  },

  stats: async (params?: { doctor_id?: number }): Promise<CTVStats> => {
    const response: AxiosResponse<CTVStats> = await managementApi.get('/api-hrm/ctv/stats/', { params });
    return response.data;
  },

  myLeaders: async (): Promise<CTVFilterEmployee[]> => {
    const response: AxiosResponse<CTVFilterEmployee[]> = await managementApi.get(
      '/api-hrm/ctv/my_leaders/'
    );
    return response.data;
  },

  myStaff: async (leaderId?: number): Promise<CTVFilterEmployee[]> => {
    const response: AxiosResponse<CTVFilterEmployee[]> = await managementApi.get(
      '/api-hrm/ctv/my_staff/',
      { params: leaderId ? { leader_id: leaderId } : undefined }
    );
    return response.data;
  },

  allEmployees: async (params?: { leader_id?: number; search?: string }): Promise<CTVFilterEmployee[]> => {
    const response: AxiosResponse<CTVFilterEmployee[]> = await managementApi.get(
      '/api-hrm/ctv/all_employees/',
      { params }
    );
    return response.data;
  },

  importFile: async (file: File): Promise<{ created: number; errors: { row: number; error: string }[]; created_ids: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await managementApi.post('/api-hrm/ctv/import_ctv/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  exportAll: async (params?: CTVListParams): Promise<Blob> => {
    const response = await managementApi.get('/api-hrm/ctv/export_ctv/', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  buildFormData: (data: CTVCreateData, imageFile?: File | null): FormData => {
    const fd = new FormData();
    (Object.entries(data) as [string, unknown][]).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        fd.append(key, String(value));
      }
    });
    if (imageFile) {
      fd.append('cccd_image', imageFile);
    }
    return fd;
  },
};

export const doctorAPI = {
  list: async (params?: { is_active?: boolean; search?: string; leader_id?: number }): Promise<Doctor[]> => {
    const response: AxiosResponse<Doctor[]> = await managementApi.get('/api-hrm/doctors/', { params });
    return response.data;
  },

  create: async (data: Partial<Doctor>): Promise<Doctor> => {
    const response: AxiosResponse<Doctor> = await managementApi.post('/api-hrm/doctors/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Doctor>): Promise<Doctor> => {
    const response: AxiosResponse<Doctor> = await managementApi.patch(`/api-hrm/doctors/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await managementApi.delete(`/api-hrm/doctors/${id}/`);
  },
};
