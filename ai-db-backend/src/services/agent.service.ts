import { spawn } from "child_process";
import axios from "axios";

export const runOrchestration = async (input: any): Promise<any> => {
    const response = await axios.post("http://ai-agent-network:5001/run", input);
    return response.data;
  };
