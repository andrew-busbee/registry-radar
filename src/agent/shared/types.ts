export interface AgentRecord {
  id: string;
  name: string;
  tags?: string[];
  host?: string;
  version?: string;
  status: 'online' | 'offline' | 'disabled';
  createdAt: string;
  lastSeenAt?: string;
}

export interface CreateAgentRequest {
  name: string;
  tags?: string[];
}

export interface CreateAgentResponse {
  agentId: string;
  enrollToken: string; // display once
  composeYaml: string;
  envContent?: string;
}


