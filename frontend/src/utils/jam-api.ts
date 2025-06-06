import axios from 'axios';

export interface ICompany {
    id: number;
    company_name: string;
    liked: boolean;
}

export interface ICollection {
    id: string;
    collection_name: string;
    companies: ICompany[];
    total: number;
}

export interface ICompanyBatchResponse {
    companies: ICompany[];
    total: number;
}

export interface ITransferProgress {
    status: 'in_progress' | 'completed' | 'failed';
    completed: number;
    total: number;
}

export interface IExistingCompaniesResponse {
    existingCompanyIds: number[];
}

const BASE_URL = 'http://localhost:8000';

export async function getCompanies(offset?: number, limit?: number): Promise<ICompanyBatchResponse> {
    try {
        const response = await axios.get(`${BASE_URL}/companies`, {
            params: {
                offset,
                limit,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
    }
}

export async function getCollectionsMetadata(): Promise<ICollection[]> {
    try {
        const response = await axios.get(`${BASE_URL}/collections`);
        return response.data;
    } catch (error) {
        console.error('Error fetching collections metadata:', error);
        throw error;
    }
}

export async function getCollectionsById(collectionId: string, offset?: number, limit?: number): Promise<ICompanyBatchResponse> {
    try {
        const response = await axios.get(`${BASE_URL}/collections/${collectionId}`, {
            params: {
                offset,
                limit,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching collection by ID:', error);
        throw error;
    }
}

export async function checkExistingCompanies(params: {
    sourceCollectionId: string;
    targetCollectionId: string;
    companyIds: number[];
}): Promise<IExistingCompaniesResponse> {
    try {
        // For now, we'll just check the first company ID
        const companyId = params.companyIds[0];
        const url = `${BASE_URL}/collections/check-existing/${params.sourceCollectionId}/${params.targetCollectionId}/${companyId}`;
        
        console.log('Making API request to check existing companies:', {
            url
        });
        
        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('API response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error checking existing companies:', error);
        if (axios.isAxiosError(error)) {
            console.error('Error details:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers
                }
            });
        }
        throw error;
    }
}

export const transferCompanies = async (
  sourceCollectionId: string,
  targetCollectionId: string,
  companyIds: number[]
): Promise<{ status: string; completed: number; total: number; transferId: string }> => {
  try {
    console.log('Transferring companies:', {
      sourceCollectionId,
      targetCollectionId,
      companyIds
    });

    const response = await axios.post(
      `${BASE_URL}/collections/transfer`,
      {
        sourceCollectionId,
        targetCollectionId,
        companyIds
      }
    );

    console.log('Transfer response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error transferring companies:', error);
    throw error;
  }
};

export const getTransferProgress = async (
  transferId: string
): Promise<{ status: string; completed: number; total: number }> => {
  try {
    const response = await axios.get(
      `${BASE_URL}/collections/transfer/${transferId}`
    );
    return response.data;
  } catch (error) {
    console.error('Error getting transfer progress:', error);
    throw error;
  }
};