import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://srv1265534.hstgr.cloud/api/v1';

export const getGovernorates = async () => {
    try {
        const response = await axios.get(`${API_URL}/data/governorates`);
        return response.data;
    } catch (error) {
        console.error('Error fetching governorates:', error);
        throw error;
    }
};

export const getFacilities = async (orgId) => {
    try {
        const url = orgId ? `${API_URL}/data/facilities?org_id=${orgId}` : `${API_URL}/data/facilities`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching facilities:', error);
        throw error;
    }
};
