import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

// Define the shape of our data so TypeScript is happy
interface Lecture {
    id: string;
    title: string;
    description: string;
    createdAt: any; // Firestore Timestamp
}

export function LectureList() {
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // 1. Create a query to fetch the lectures collection, ordering newest first
        const q = query(collection(db, "lectures"), orderBy("createdAt", "desc"));

        // 2. Listen for real-time updates
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lectureData: Lecture[] = [];
            snapshot.forEach((doc) => {
                lectureData.push({ id: doc.id, ...doc.data() } as Lecture);
            });
            setLectures(lectureData);
            setLoading(false);
        }, (error) => {
            console.error("❌ Error fetching lectures:", error);
            setLoading(false);
        });

        // 3. Clean up the listener when the component unmounts
        return () => unsubscribe();
    }, []);

    // Show a pulsing loading state while waiting for Firebase
    if (loading) {
        return (
            <div className="text-cyan-400 text-center mt-20 animate-pulse font-medium text-lg">
                Loading your workspace...
            </div>
        );
    }

    // Show a friendly empty state if the database has no lectures yet
    if (lectures.length === 0) {
        return (
            <div className="text-center mt-32 text-slate-400 flex flex-col items-center">
                <div className="w-16 h-16 mb-4 opacity-50">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                </div>
                <p className="text-2xl font-bold text-white mb-2 tracking-tight">It's quiet in here...</p>
                <p>Click the + button in the top right to create your first lecture.</p>
            </div>
        );
    }

    // Render the grid of lecture cards
    return (
        <div className="w-full max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
            {lectures.map((lecture) => (
                <div
                    key={lecture.id}
                    onClick={() => navigate(`/lecture/${lecture.id}`)}
                    className="group relative flex flex-col justify-between bg-slate-900/80 backdrop-blur-sm border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_8px_30px_rgba(34,211,238,0.1)] overflow-hidden min-h-[160px]"
                >
                    {/* Glowing top border effect on hover */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div>
                        <div className="flex items-start justify-between mb-3">
                            <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                                {lecture.title}
                            </h3>
                            {/* Small Notebook Icon */}
                            <svg className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                            </svg>
                        </div>
                        <p className="text-slate-400 line-clamp-2 text-sm leading-relaxed">
                            {lecture.description || "No description provided."}
                        </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1.5">
                            {/* Small Calendar Icon */}
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {lecture.createdAt?.toDate ? lecture.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Just now'}
                        </span>
                        
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400 font-bold flex items-center gap-1">
                            Open <span aria-hidden="true">&rarr;</span>
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}