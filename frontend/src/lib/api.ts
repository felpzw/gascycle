import axios from 'axios'

// In dev, Vite proxies "/api" to the FastAPI backend (see vite.config.ts).
// In prod, set VITE_API_BASE_URL to the deployed backend URL.
const baseURL = import.meta.env.VITE_API_BASE_URL ?? ''

export const api = axios.create({ baseURL })

export interface HealthResponse {
  status: string
  version: string
}

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>('/api/health')
  return data
}

// ===== Módulo 1 — Compressão =====

export type PropertyModel = 'ideal' | 'real'

export interface CompressionInput {
  fluid: string
  model: PropertyModel
  P_in: number // kPa
  T_in: number // °C
  P_out: number // kPa
  mass_flow: number // kg/s
  efficiency_isen: number // 0-1
}

export interface CompressionOutput {
  fluid: string
  model: PropertyModel
  power_required: number // kW
  work_specific: number // kJ/kg
  T_out: number // °C
  T_out_isentropic: number // °C
  enthalpy_change: number // kJ/kg
  enthalpy_change_isentropic: number // kJ/kg
}

export async function getFluids(): Promise<string[]> {
  const { data } = await api.get<{ fluids: string[] }>('/api/compression/fluids')
  return data.fluids
}

export async function computeCompression(
  input: CompressionInput,
): Promise<CompressionOutput> {
  const { data } = await api.post<CompressionOutput>('/api/compression', input)
  return data
}

// ===== Módulo 2 — Enchimento de reservatório =====

export interface FillingInput {
  fluid: string
  model: PropertyModel
  volume: number // L
  P_initial: number // kPa
  T_initial: number // °C
  P_line: number // kPa
  T_line: number // °C
  P_final: number // kPa
  heat: number // kJ
  mass_flow_in?: number | null // kg/s (opcional)
}

export interface FillingOutput {
  fluid: string
  model: PropertyModel
  m_initial: number // kg
  m_final: number // kg
  m_added: number // kg
  T_final: number // °C
  u_initial: number // kJ/kg
  u_final: number // kJ/kg
  fill_time: number | null // s
}

export async function computeFilling(
  input: FillingInput,
): Promise<FillingOutput> {
  const { data } = await api.post<FillingOutput>('/api/filling', input)
  return data
}
