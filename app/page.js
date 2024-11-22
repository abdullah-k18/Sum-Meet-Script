"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Box,
  Typography,
  Button,
  Paper,
  LinearProgress,
  IconButton,
} from "@mui/material";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import GitHubIcon from "@mui/icons-material/GitHub";

export default function Home() {
  const [audioFile, setAudioFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [transcription, setTranscription] = useState("");
  const [transcriptId, setTranscriptId] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [summary, setSummary] = useState("");

  const fileInputRef = useRef();

  const handleFileInputClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const API_KEY = process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY;
  const supportedFormats = [
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/flac",
    "audio/ogg",
    "audio/webm",
  ];

  const updateProgress = (percent, message) => {
    setProgress(percent);
    setProgressMessage(message);
  };

  const handleError = (message) => {
    alert(message);
    setIsUploading(false);
    setProgress(0);
  };

  const validateFile = (file) => {
    if (supportedFormats.includes(file.type)) {
      return true;
    } else {
      alert(
        "Unsupported file format. Please upload an audio file in MP3, WAV, M4A, FLAC, OGG, or WEBM format."
      );
      return false;
    }
  };

  const transcribeAudio = async () => {
    if (!audioFile) {
      handleError("Please select an audio file.");
      return;
    }

    if (!validateFile(audioFile)) {
      return;
    }

    const formData = new FormData();
    formData.append("audio", audioFile);

    try {
      setIsUploading(true);
      updateProgress(10, "Uploading audio file...");

      const uploadResponse = await fetch(
        "https://api.assemblyai.com/v2/upload",
        {
          method: "POST",
          headers: {
            authorization: API_KEY,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload the audio file.");
      }

      const uploadData = await uploadResponse.json();
      const uploadUrl = uploadData.upload_url;
      updateProgress(40, "Audio file uploaded. Sending for transcription...");

      const transcriptResponse = await fetch(
        "https://api.assemblyai.com/v2/transcript",
        {
          method: "POST",
          headers: {
            authorization: API_KEY,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            audio_url: uploadUrl,
            speaker_labels: true,
            summarization: true,
            summary_model: "informative",
            summary_type: "paragraph",
          }),
        }
      );

      if (!transcriptResponse.ok) {
        throw new Error("Failed to create the transcription request.");
      }

      const transcriptData = await transcriptResponse.json();
      setTranscriptId(transcriptData.id);
      updateProgress(60, "Transcription in progress...");

      let status = "queued";
      while (status !== "completed" && status !== "error") {
        await new Promise((r) => setTimeout(r, 3000));
        const statusResponse = await fetch(
          `https://api.assemblyai.com/v2/transcript/${transcriptData.id}`,
          {
            method: "GET",
            headers: {
              authorization: API_KEY,
            },
          }
        );

        if (!statusResponse.ok) {
          throw new Error("Failed to check the transcription status.");
        }

        const statusData = await statusResponse.json();
        status = statusData.status;

        if (status === "completed") {
          updateProgress(100, "Transcription completed!");
          setTranscription(statusData.text);

          const summaryText = statusData.summary || "No summary available.";
          setSummary(summaryText);

          const speakerOutput = statusData.utterances
            .map((utterance) => {
              return `Speaker ${utterance.speaker}: ${utterance.text}`;
            })
            .join("\n");

          setTranscription(speakerOutput);
        } else if (status === "error") {
          throw new Error("An error occurred during transcription.");
        } else {
          const progressPercent = status === "processing" ? 70 : 50;
          updateProgress(progressPercent, "Transcription in progress...");
        }
      }
    } catch (error) {
      console.error(error);
      handleError(error.message);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && validateFile(file)) {
      setAudioFile(file);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && validateFile(file)) {
      setAudioFile(file);
    }
  };

  const handleDownload = (content, fileName) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "black",
        color: "white",
      }}
    >
      <Box
        component="main"
        sx={{
          textAlign: "center",
          py: 6,
          bgcolor: "black",
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography
          variant="h1"
          sx={{ fontSize: "2.5rem", fontWeight: "bold", mb: 2 }}
        >
          Sum-Meet-Script
        </Typography>
        <Typography variant="body1" sx={{ px: "25%", fontSize: "1rem" }}>
          Upload your meeting audio, transcribe it with speaker diarization to
          identify each speaker, and download the transcript as a file. Plus,
          generate a concise summary of the conversation for easy reference.
        </Typography>
      </Box>

      <Box
        component="main"
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          px: 2,
        }}
      >
        <Box component="section" sx={{ mt: 2, width: "100%", maxWidth: 600 }}>
          <Paper
            elevation={3}
            sx={{
              border: "2px dashed",
              borderColor: "gray",
              p: 4,
              textAlign: "center",
              bgcolor: "white",
              cursor: "pointer",
              transition: "0.3s",
              "&:hover": { borderColor: "primary.main" },
            }}
            onClick={handleFileInputClick}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <Typography color="text.secondary">
              {audioFile
                ? audioFile.name
                : "Drag and drop your audio file here or click to select"}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: "block" }}
            >
              Accepted formats: MP3, WAV, M4A, FLAC, OGG, WEBM
            </Typography>
            <input
              type="file"
              accept=".mp3, .wav, .m4a, .flac, .ogg, .webm"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </Paper>

          <Button
            variant="contained"
            color="primary"
            sx={{
              mt: 2,
              bgcolor: "#669df6",
              "&:hover": { bgcolor: "#4285f4" },
            }}
            onClick={transcribeAudio}
            disabled={isUploading}
          >
            {isUploading ? "Generating..." : "Generate Meeting Transcript"}
          </Button>
        </Box>

        {progress > 0 && (
          <Box
            component="section"
            sx={{ textAlign: "center", mt: 4, width: "100%", maxWidth: 600 }}
          >
            <LinearProgress variant="determinate" value={progress} />
            <Typography
              variant="caption"
              sx={{ mt: 1, display: "block", color: "text.secondary" }}
            >
              {progressMessage}
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            mt: 4,
            mx: "auto",
            mb: 5,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            gap: 3,
          }}
        >
          {transcription && (
            <Box
              sx={{
                flex: 1,
                bgcolor: "#303234",
                p: { xs: 2, sm: 3 },
                borderRadius: 2,
                color: "white",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Typography variant="h6" gutterBottom>
                Meeting Transcript
              </Typography>
              <Typography
                component="pre"
                sx={{
                  bgcolor: "#303234",
                  p: { xs: 1, sm: 2 },
                  border: "1px solid white",
                  borderRadius: 1,
                  maxHeight: 200,
                  maxWidth: 500,
                  overflowY: "scroll",
                  overflowX: "block",
                  wordWrap: "break-word",
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                }}
              >
                {transcription}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{
                    bgcolor: "#669df6",
                    "&:hover": { bgcolor: "#4285f4" },
                  }}
                  onClick={() =>
                    handleDownload(transcription, "meeting-transcript.txt")
                  }
                >
                  Download Transcript
                </Button>
              </Box>
            </Box>
          )}

          {summary && (
            <Box
              sx={{
                flex: 1,
                bgcolor: "#303234",
                p: { xs: 2, sm: 3 },
                borderRadius: 2,
                color: "white",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Typography variant="h6" gutterBottom>
                Meeting Summary
              </Typography>
              <Typography
                component="pre"
                sx={{
                  bgcolor: "#303234",
                  p: { xs: 1, sm: 2 },
                  border: "1px solid white",
                  borderRadius: 1,
                  height: 200,
                  width: 500,
                  maxHeight: 200,
                  maxWidth: 500,
                  overflowY: "scroll",
                  overflowX: "block",
                  wordWrap: "break-word",
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                }}
              >
                {summary}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{
                    bgcolor: "#669df6",
                    "&:hover": { bgcolor: "#4285f4" },
                  }}
                  onClick={() => handleDownload(summary, "meeting-summary.txt")}
                >
                  Download Summary
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      <hr />

      <footer className="p-2 text-center items-center">
        <Link href="https://github.com/abdullah-k18" target="_blank">
          <IconButton sx={{ color: "white" }}>
            <GitHubIcon />
          </IconButton>
        </Link>
        <Link href="https://www.linkedin.com/in/abdullah-k18/" target="_black">
          <IconButton sx={{ color: "white" }}>
            <LinkedInIcon />
          </IconButton>
        </Link>
      </footer>
    </Box>
  );
}
