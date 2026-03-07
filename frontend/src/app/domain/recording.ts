export interface Recording {
  id: string;
  patientId?: string;
  createdAt?: string;
  updatedAt?: string;
  duration?: number;
  audioUrl?: string;
  transcription?: string;
  summary?: string;
  audioBlob?: Blob;
  status: "recording" | "recorded" | "transcribing" | "ready" | "failed";
}
