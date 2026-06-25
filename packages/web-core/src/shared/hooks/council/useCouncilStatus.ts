import { useQuery } from '@tanstack/react-query';
import { makeCouncilRequest } from '@/shared/lib/councilApiTransport';

export interface SystemdService {
  service: string;
  active: boolean;
  pid: number | null;
  error?: string;
}

export interface CouncilStatus {
  ok: boolean;
  restarting: boolean;
  pid: number;
  arc_llm: {
    pid: number | null;
    port: number;
    reachable: boolean;
    model: string;
  };
  systemd_services: SystemdService[];
  restart_log: string[];
}

export function useCouncilStatus() {
  return useQuery<CouncilStatus>({
    queryKey: ['council', 'status'],
    queryFn: async () => {
      const res = await makeCouncilRequest('/v1/council/status');
      if (!res.ok) throw new Error(`Failed to fetch council status: ${res.status}`);
      return res.json();
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });
}
