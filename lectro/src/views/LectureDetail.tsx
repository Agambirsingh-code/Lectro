import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { LectroNavbar } from "../components/Navbar";
import Editor from "../components/Editor";
import { LiveCaptions } from "../components/LiveCaptions";
import { LiveAINotes } from "../components/LiveAINotes";
import { generateQuiz } from "../lib/api"; // ✨ Import our new API function
import { Modal } from "flowbite-react"; // ✨ Import Modal for the quiz UI

type Lecture = {
    id: string;
    title: string;
    description?: string;
};

// Define the shape of our quiz data
type QuizQuestion = {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
};

export function LectureDetail() {
    const { id } = useParams<{ id: string }>();
    const [lecture, setLecture] = useState<Lecture | null>(null);
    const [ccActive, setCcActive] = useState(false);
    const [aiNotesActive, setAiNotesActive] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [latestNote, setLatestNote] = useState<string | null>(null);
    const [dyslexicFontActive, setDyslexicFontActive] = useState(false);

    // ✨ New Quiz State
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const [quizData, setQuizData] = useState<{ questions: QuizQuestion[] } | null>(null);
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        async function fetchLecture() {
            if (!id) return;
            const lectureRef = doc(db, "lectures", id);
            const lectureSnap = await getDoc(lectureRef);
            if (lectureSnap.exists()) {
                setLecture({ id, ...lectureSnap.data() } as Lecture);
            }
        }
        fetchLecture();
    }, [id]);

    // ✨ The Quiz Generator Function
    const handleGenerateQuiz = async () => {
        // Tiptap editors use the class 'ProseMirror'. We grab the text directly from the DOM!
        const editorElement = document.querySelector(".ProseMirror") as HTMLElement;
        const currentContent = editorElement?.innerText || "";

        if (!currentContent || currentContent.length < 50) {
            alert("Please type some more notes (at least a few sentences) before generating a quiz!");
            return;
        }

        setIsGeneratingQuiz(true);
        try {
            const data = await generateQuiz(currentContent);
            setQuizData(data);
            setUserAnswers({}); // Reset answers
            setShowResults(false); // Reset results state
            setShowQuizModal(true); // Open the modal
        } catch (error) {
            console.error(error);
            alert("Failed to generate quiz. Make sure your backend is running!");
        } finally {
            setIsGeneratingQuiz(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900">
            <LectroNavbar
                recordMode
                ccActive={ccActive}
                onToggleCC={() => setCcActive((v) => !v)}
                aiNotesActive={aiNotesActive}
                onToggleAINotes={() => setAiNotesActive((v) => !v)}
                dyslexicFontActive={dyslexicFontActive}
                onToggleDyslexicFont={() => setDyslexicFontActive((v) => !v)}
                // ✨ Pass the new quiz props to the Navbar!
                onGenerateQuiz={handleGenerateQuiz}
                isGeneratingQuiz={isGeneratingQuiz}
            />
            <main className="flex flex-col items-center pt-24 gap-8 px-4 pb-24">
                {!lecture ? (
                    <div className="text-cyan-400 text-lg animate-pulse">Loading lecture...</div>
                ) : (
                    <div className="w-full max-w-6xl p-6 space-y-6 shadow bg-slate-900/50 rounded-xl border border-slate-800">
                        {/* Layout: when CC active, split screen */}
                        <div
                            className={`grid gap-6 ${
                                ccActive ? "grid-cols-2" : "grid-cols-1"
                            }`}
                        >
                            <div>
                                <Editor
                                    lectureId={lecture.id}
                                    initialContent={`<h1>${
                                        lecture.title
                                    }</h1><p>${lecture.description || ""}</p>`}
                                    appendContent={latestNote}
                                    dyslexicFontActive={dyslexicFontActive}
                                />
                            </div>
                            {ccActive && (
                                <div className="space-y-4">
                                    <LiveCaptions
                                        isActive={ccActive}
                                        onTranscript={(t) => setTranscript(t)}
                                        dyslexicFontActive={dyslexicFontActive}
                                    />
                                    {aiNotesActive && (
                                        <LiveAINotes
                                            isActive={aiNotesActive}
                                            transcript={transcript}
                                            dyslexicFontActive={dyslexicFontActive}
                                            onNewNotes={(notes) => {
                                                notes.forEach((note, i) =>
                                                    setTimeout(
                                                        () =>
                                                            setLatestNote(note),
                                                        i * 120
                                                    )
                                                );
                                            }}
                                        />
                                    )}
                                </div>
                            )}

                            {!ccActive && aiNotesActive && (
                                <div className="mt-4">
                                    <LiveAINotes
                                        isActive={aiNotesActive}
                                        transcript={transcript}
                                        dyslexicFontActive={dyslexicFontActive}
                                        onNewNotes={(notes) => {
                                            notes.forEach((note, i) =>
                                                setTimeout(
                                                    () => setLatestNote(note),
                                                    i * 120
                                                )
                                            );
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* ✨ The Quiz Modal UI */}
            <Modal show={showQuizModal} onClose={() => setShowQuizModal(false)} size="2xl">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-h-[85vh] overflow-y-auto">
                    <h2 className="text-2xl text-white font-bold mb-6 flex items-center gap-2">
                        <span className="text-2xl">🧠</span> Knowledge Check
                    </h2>
                    
                    {quizData?.questions?.map((q, idx) => (
                        <div key={idx} className="mb-8 bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                            <p className="text-white text-lg font-medium mb-4">
                                {idx + 1}. {q.question}
                            </p>
                            <div className="space-y-3">
                                {q.options.map((opt) => {
                                    const isSelected = userAnswers[idx] === opt;
                                    const isCorrect = opt === q.correctAnswer;
                                    
                                    // Default styling
                                    let bgClass = "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:border-slate-500 cursor-pointer";

                                    // Styling when results are shown
                                    if (showResults) {
                                        if (isCorrect) bgClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500 font-medium cursor-default";
                                        else if (isSelected && !isCorrect) bgClass = "bg-red-500/20 text-red-300 border-red-500 cursor-default";
                                        else bgClass = "bg-slate-800/50 text-slate-500 border-slate-700/50 cursor-default"; // Unselected wrong answers dim
                                    } 
                                    // Styling when actively selecting
                                    else if (isSelected) {
                                        bgClass = "bg-cyan-500/20 text-cyan-300 border-cyan-500 font-medium";
                                    }

                                    return (
                                        <button
                                            key={opt}
                                            disabled={showResults}
                                            onClick={() => setUserAnswers((prev) => ({ ...prev, [idx]: opt }))}
                                            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${bgClass}`}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>
                            
                            {/* Show Explanation if Results are toggled */}
                            {showResults && (
                                <div className={`mt-4 p-4 rounded-lg text-sm border ${userAnswers[idx] === q.correctAnswer ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200" : "bg-red-500/10 border-red-500/20 text-red-200"}`}>
                                    <span className="font-bold uppercase tracking-wider text-xs opacity-70 block mb-1">Explanation</span>
                                    {q.explanation}
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="mt-8 pt-4 border-t border-slate-800 flex justify-end gap-3">
                        {!showResults ? (
                            <button
                                onClick={() => setShowResults(true)}
                                // Disable until all questions have an answer selected
                                disabled={Object.keys(userAnswers).length !== quizData?.questions?.length}
                                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                            >
                                Check Answers
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowQuizModal(false)}
                                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
                            >
                                Close Quiz
                            </button>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}