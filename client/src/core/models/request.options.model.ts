export interface RequestOptionsModel {
  body?: string
  credentials?: string
  headers: {
    Authorization?: string
    'Content-Type'?: string
  }
  method?: string
}
