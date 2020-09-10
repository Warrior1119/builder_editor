export interface OperationInterface {
  action?: string;
  forceUrl?: string;
  isSubmit?: boolean;
  open?: 'self' | 'blank';
  actionData: any;
  request?: { // Deprecated?
    url?: string;
    method?: string;
  };
}

export interface OperationButtonInterface extends OperationInterface {
  text: string;
}
