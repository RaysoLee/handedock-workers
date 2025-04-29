export interface CustomerNode {
  id: string;
  email: string;
}

export interface CustomerQueryResponse {
  data?: {
    customers?: {
      edges: { node: CustomerNode }[];
    };
  };
  errors?: any;
}

export interface ShopifyOrder {
  id: number;
  name: string;
  [key: string]: any;
}
