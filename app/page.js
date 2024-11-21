"use client"

import { useState } from 'react';

export default function Home() {
  const [audioFile, setAudioFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [transcription, setTranscription] = useState('');
  const [transcriptId, setTranscriptId] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const API_KEY = 'ca95804f5de7464e9ea41d795ff27116';
  const supportedFormats = [
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/flac',
    'audio/ogg',
    'audio/webm'
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
      alert('Unsupported file format. Please upload an audio file in MP3, WAV, M4A, FLAC, OGG, or WEBM format.');
      return false;
    }
  };

  const transcribeAudio = async () => {
    if (!audioFile) {
      handleError('Please select an audio file.');
      return;
    }
  
    if (!validateFile(audioFile)) {
      return;
    }
  
    const formData = new FormData();
    formData.append('audio', audioFile);
  
    try {
      setIsUploading(true);
      updateProgress(10, 'Uploading audio file...');
  
      const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          'authorization': API_KEY
        },
        body: formData
      });
  
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload the audio file.');
      }
  
      const uploadData = await uploadResponse.json();
      const uploadUrl = uploadData.upload_url;
      updateProgress(40, 'Audio file uploaded. Sending for transcription...');
  
      const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'authorization': API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: uploadUrl,
          speaker_labels: true
        })
      });
  
      if (!transcriptResponse.ok) {
        throw new Error('Failed to create the transcription request.');
      }
  
      const transcriptData = await transcriptResponse.json();
      setTranscriptId(transcriptData.id);
      updateProgress(60, 'Transcription in progress...');
  
      let status = 'queued';
      while (status !== 'completed' && status !== 'error') {
        await new Promise((r) => setTimeout(r, 3000));
        const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptData.id}`, {
          method: 'GET',
          headers: {
            'authorization': API_KEY
          }
        });
  
        if (!statusResponse.ok) {
          throw new Error('Failed to check the transcription status.');
        }
  
        const statusData = await statusResponse.json();
        status = statusData.status;
  
        if (status === 'completed') {
          updateProgress(100, 'Transcription completed!');
          setTranscription(statusData.text);
  
          const speakerOutput = statusData.utterances.map(utterance => {
            return `Speaker ${utterance.speaker}: ${utterance.text}`;
          }).join('\n');
  
          setTranscription(speakerOutput);
        } else if (status === 'error') {
          throw new Error('An error occurred during transcription.');
        } else {
          const progressPercent = status === 'processing' ? 70 : 50;
          updateProgress(progressPercent, 'Transcription in progress...');
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

  const handleDownload = () => {
    const blob = new Blob([transcription], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcription.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="bg-black text-white text-center py-12">
        <h1 className="text-5xl font-bold mb-4">Sum-Meet-Script</h1>
        <p className="text-lg px-[25%]">
        Upload your meeting audio, transcribe it with speaker diarization to identify each speaker, and download the transcription as a file. Plus, generate a concise summary of the conversation for easy reference.
        </p>
      </div>

      <main className="flex flex-col items-center justify-center h-screen">
        <section className="mt-8 w-full max-w-2xl px-4">
          <div
            className="border-2 border-gray-300 border-dashed rounded-lg p-8 text-center bg-white transition duration-300 cursor-pointer relative overflow-hidden"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <p className="text-gray-500 text-lg">
              {audioFile ? audioFile.name : 'Drag and drop your audio file here or click to select'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Accepted formats: MP3, WAV, M4A, FLAC, OGG, WEBM
            </p>
            <input
              type="file"
              id="audioFile"
              accept=".mp3, .wav, .m4a, .flac, .ogg, .webm"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <button
            className="inline-block px-4 py-2 font-bold bg-[#303234] text-white rounded-full text-base transition-transform duration-100 transform hover:bg-[#4285f4] mt-8"
            onClick={transcribeAudio}
            disabled={isUploading}
          >
            {isUploading ? 'Transcribing...' : 'Transcribe'}
          </button>
        </section>

        {progress > 0 && (
          <section className="text-center mt-8 w-full max-w-2xl px-4">
            <div className="w-full bg-gray-300 rounded-full overflow-hidden h-5 mb-4">
              <div className="h-full bg-[#303234] transition-all" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="text-sm text-gray-400">{progressMessage}</p>
          </section>
        )}

        {transcription && (
          <section className="mt-8 bg-[#303234] p-6 rounded-lg shadow-md max-w-2xl px-4 animate-fadeIn">
            <h2 className="text-white text-xl mb-4">Transcription Result</h2>
            <pre className="bg-[#303234] border border-white p-4  rounded-md max-h-72 overflow-y-auto whitespace-pre-wrap break-words text-sm">
              {transcription}
            </pre>
            <div className="flex gap-4 flex-wrap mt-4">
              <button
                className="flex-1 text-center px-4 py-2 bg-black text-white rounded-full text-base transition-transform duration-100 transform hover:bg-[#4285f4]"
                onClick={handleDownload}
              >
                Download Transcription
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
