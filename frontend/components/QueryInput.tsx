import { Send } from 'lucide-react';

interface Props {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    loading: boolean;
}

export const QueryInput = ({ value, onChange, onSubmit, loading }: Props) => {
    return (
        <div className="relative">
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onSubmit();
                    }
                }}
                placeholder="Ask a question about your data... (e.g. Show total revenue by region)"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 pr-12 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-32 text-lg shadow-lg"
            />
            <button
                onClick={onSubmit}
                disabled={loading || !value.trim()}
                className="absolute bottom-4 right-4 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 transition"
            >
                <Send className="w-5 h-5" />
            </button>
        </div>
    );
};

