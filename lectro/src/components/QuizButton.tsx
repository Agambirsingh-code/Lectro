type Props = {
    onClick: () => void;
    isGenerating: boolean;
};

export function QuizButton({ onClick, isGenerating }: Props) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isGenerating}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 border border-slate-700/50 
                ${isGenerating 
                    ? "bg-slate-800 text-slate-400 cursor-not-allowed" 
                    : "bg-slate-800/80 hover:bg-slate-700 text-white hover:border-purple-500/50 hover:shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                }`}
        >
            {isGenerating ? (
                <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                </>
            ) : (
                <>
                    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Generate Quiz
                </>
            )}
        </button>
    );
}