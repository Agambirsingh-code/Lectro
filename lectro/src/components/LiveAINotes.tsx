import React, { useEffect, useRef, useState } from "react";

// --- Speech types (for embedded recognizer if transcript prop isn't provided)
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((e: any) => void) | null;
    onerror: ((e: any) => void) | null;
    onend: (() => void) | null;
}

interface LiveAINotesProps {
    isActive: boolean;
    transcript: string;
    onNewNotes?: (notes: string[]) => void;
    dyslexicFontActive?: boolean;
}

export const LiveAINotes: React.FC<LiveAINotesProps> = ({
    isActive,
    transcript,
    onNewNotes,
    dyslexicFontActive = false,
}) => {
    const [notes, setNotes] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const transcriptBuffer = useRef("");
    const lastProcessedLength = useRef(0);
    // For standalone listening when `transcript` prop is empty
    const recogRef = useRef<SpeechRecognition | null>(null);
    const runningRef = useRef(false);
    const lastLocalLength = useRef(0);
    const activeRef = useRef(isActive);
    const transcriptPropRef = useRef(transcript);

    // Only accumulate NEW parts of the transcript
    useEffect(() => {
        // If an external transcript is provided (from LiveCaptions), prefer it
        if (isActive && transcript && transcript.length > 0) {
            // Only add if transcript has grown
            if (transcript.length > lastProcessedLength.current) {
                const newText = transcript.slice(lastProcessedLength.current);
                transcriptBuffer.current += " " + newText;
                lastProcessedLength.current = transcript.length;
                console.log(
                    "📝 Buffer updated (external), length:",
                    transcriptBuffer.current.length
                );
            }
            // If we have an external transcript, ensure internal recognizer is stopped
            try {
                if (recogRef.current && runningRef.current) {
                    recogRef.current.abort();
                    recogRef.current.stop();
                    runningRef.current = false;
                    console.log(
                        "🔇 Internal recognizer stopped because external transcript is present"
                    );
                }
            } catch {}
            return;
        }
    }, [transcript, isActive]);

    // keep refs in sync to avoid capturing stale values in callbacks
    useEffect(() => {
        activeRef.current = isActive;
    }, [isActive]);
    useEffect(() => {
        transcriptPropRef.current = transcript;
    }, [transcript]);

    // Reset when stopped or started
    useEffect(() => {
        if (!isActive) {
            transcriptBuffer.current = "";
            lastProcessedLength.current = 0;
            lastLocalLength.current = 0;
            setNotes([]);
            setIsProcessing(false);
            // stop internal recognizer if running
            try {
                if (recogRef.current && runningRef.current) {
                    recogRef.current.abort();
                    recogRef.current.stop();
                    runningRef.current = false;
                }
            } catch {}
            console.log("🔄 AI Notes reset");
        } else {
            // Fresh start
            transcriptBuffer.current = "";
            lastProcessedLength.current = 0;
            lastLocalLength.current = 0;
            setNotes([]);
            setIsProcessing(false);
            console.log("▶️ AI Notes activated");
        }
    }, [isActive]);

    /* ---------- Initialize embedded SpeechRecognition (only used when no external transcript) ---------- */
    useEffect(() => {
        const SR =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;
        if (!SR) {
            console.warn(
                "🗣️ Web Speech API not supported (AI Notes internal recognizer will be disabled)."
            );
            return;
        }

        const recog: SpeechRecognition = new SR();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = "en-US";

        recog.onresult = (event: any) => {
            let fullText = "";
            let interimText = "";

            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    fullText += result[0].transcript + " ";
                } else {
                    interimText += result[0].transcript;
                }
            }

            const combined = (fullText + interimText).trim();

            // Only add NEW parts relative to lastLocalLength
            if (combined.length > lastLocalLength.current) {
                const newText = combined.slice(lastLocalLength.current);
                transcriptBuffer.current += " " + newText;
                lastLocalLength.current = combined.length;
                console.log(
                    "📝 Buffer updated (internal), length:",
                    transcriptBuffer.current.length
                );
            }
        };

        recog.onerror = (e: any) => {
            if (e.error === "not-allowed") {
                console.error("🚫 Microphone permission denied for AI Notes.");
            } else if (e.error !== "aborted") {
                console.error("Speech recognition error (AI Notes):", e.error);
            }
        };

        recog.onend = () => {
            runningRef.current = false;
            // auto-restart only if still active and no external transcript
            if (isActive && (!transcript || transcript.length === 0)) {
                setTimeout(() => {
                    try {
                        recog.start();
                        runningRef.current = true;
                    } catch (err) {
                        console.debug(
                            "AI Notes recognizer restart failed:",
                            err
                        );
                    }
                }, 200);
            }
        };

        recogRef.current = recog;

        return () => {
            try {
                recog.onresult = null;
                recog.onerror = null;
                recog.onend = null;
                recog.abort();
                recog.stop();
            } catch {   }
            recogRef.current = null;
            runningRef.current = false;
        };
    }, []);

    // Start/stop internal recognizer depending on isActive and presence of external transcript
    useEffect(() => {
        const recog = recogRef.current;
        if (!recog) return;

        // If external transcript is present, don't run internal recognizer
        if (transcript && transcript.length > 0) {
            try {
                if (runningRef.current) {
                    recog.abort();
                    recog.stop();
                    runningRef.current = false;
                }
            } catch {}
            return;
        }

        if (isActive) {
            if (!runningRef.current) {
                try {
                    lastLocalLength.current = 0;
                    recog.start();
                    runningRef.current = true;
                    console.log("🎤 AI Notes internal recognizer started");
                } catch (err) {
                    console.debug("AI Notes recognizer start failed:", err);
                }
            }
        } else {
            try {
                recog.abort();
                recog.stop();
            } catch {}
            runningRef.current = false;
        }
    }, [isActive, transcript]);

    // Periodically summarize buffer
    useEffect(() => {
        if (!isActive) return;

        const interval = setInterval(async () => {
            const textToSummarize = transcriptBuffer.current.trim();

            // Skip if too short or already processing
            if (
                !textToSummarize ||
                textToSummarize.length < 10 ||
                isProcessing
            ) {
                console.log("⏭️ Skipping summarization:", {
                    length: textToSummarize.length,
                    isProcessing,
                });
                return;
            }

            console.log(
                "🔄 Starting summarization, text length:",
                textToSummarize.length
            );
            setIsProcessing(true);

            try {
                const response = await fetch(
                    "http://localhost:3001/api/summarize",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ transcript: textToSummarize }),
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                console.log("✅ Received from backend:", data);

                // Parse the notes string into an array
                if (data.notes && typeof data.notes === "string") {
                    // Split by newlines and clean up
                    const parsedNotes = data.notes
                        .split("\n")
                        .map((line: string) => line.trim())
                        .filter((line: string) => {
                            // Remove empty lines, separators, and very short lines
                            return (
                                line.length > 0 &&
                                line !== "---" &&
                                line.length > 3
                            );
                        })
                        .map((line: string) => {
                            // Clean up bullet points if they exist
                            return line.replace(/^[•\-\*]\s*/, "");
                        });

                    if (parsedNotes.length > 0) {
                        if (onNewNotes) {
                            onNewNotes(parsedNotes);
                        }
                        setNotes((prev) => [...prev, ...parsedNotes]);
                        console.log(
                            "📋 Added",
                            parsedNotes.length,
                            "new notes"
                        );
                    }
                }

                // Clear the buffer after successful summarization
                transcriptBuffer.current = "";
                console.log("🧹 Buffer cleared");
            } catch (error) {
                console.error("❌ AI summarization error:", error);
            } finally {
                setIsProcessing(false);
            }
        }, 10000); // Every 10 seconds

        return () => clearInterval(interval);
    }, [isActive, isProcessing, onNewNotes]);

    return (
        <div className="bg-neutral-900 text-white p-4 rounded-lg mt-4 max-h-60 overflow-y-auto transition-all duration-100">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">AI Notes</h2>
                {isProcessing && (
                    <span className="text-xs text-blue-400 animate-pulse">
                        Processing...
                    </span>
                )}
            </div>
            {notes.length > 0 ? (
                <ul 
                    className={`list-disc ml-6 space-y-2 text-gray-300 ${dyslexicFontActive ? 'dyslexic-font-active' : ''}`}
                    style={{
                        fontFamily: dyslexicFontActive ? '"OpenDyslexic", sans-serif' : undefined
                    }}
                >
                    {notes.map((note, idx) => (
                        <li key={idx}>{note}</li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-500 italic">
                    {isProcessing
                        ? "Generating notes..."
                        : "AI is listening and preparing notes..."}
                </p>
            )}
        </div>
    );
};
