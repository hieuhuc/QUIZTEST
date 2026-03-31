import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, loginWithGoogle, logout, db } from "./firebase";
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, orderBy } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { 
  Plus, 
  Trash2, 
  Eye, 
  Play, 
  Pause, 
  BarChart3, 
  LogOut, 
  User as UserIcon, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  FileText, 
  Sparkles,
  Download,
  Share2,
  ArrowLeft
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import * as XLSX from "xlsx";

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Footer = () => (
  <footer className="w-full py-6 mt-auto border-t border-gray-200 bg-white">
    <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
      <p>Thiết kế và xây dựng: Trần Trung Hiếu</p>
    </div>
  </footer>
);

const Navbar = ({ user }: { user: User | null }) => (
  <nav className="w-full border-b border-gray-200 bg-white sticky top-0 z-50">
    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">AI</div>
        <span className="font-bold text-xl tracking-tight text-gray-900">QuizMaster</span>
      </Link>
      
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link to="/teacher" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">Dashboard</Link>
            <button 
              onClick={logout}
              className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
            >
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
          </>
        ) : (
          <Link to="/teacher" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">Dành cho Giảng viên</Link>
        )}
      </div>
    </div>
  </nav>
);

// --- Pages ---

const Home = () => {
  const [quizCode, setQuizCode] = useState("");
  const navigate = useNavigate();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (quizCode.trim()) {
      navigate(`/quiz/${quizCode.trim()}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[70vh]">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">Hệ thống Kiểm tra Trắc nghiệm</h1>
          <p className="text-lg text-gray-600">Nhập mã bài kiểm tra hoặc quét QR để bắt đầu làm bài.</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <input 
            type="text" 
            placeholder="Mã bài kiểm tra (ID)" 
            value={quizCode}
            onChange={(e) => setQuizCode(e.target.value)}
            className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:ring-0 transition-all text-center font-mono uppercase tracking-widest"
          />
          <button 
            type="submit"
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
          >
            Bắt đầu làm bài
          </button>
        </form>

        <div className="pt-8 border-t border-gray-100">
          <p className="text-sm text-gray-400">Sinh viên vui lòng nhập đúng Họ tên và Mã sinh viên khi được yêu cầu.</p>
        </div>
      </div>
    </div>
  );
};

// --- Teacher Dashboard ---

const TeacherDashboard = ({ user }: { user: User | null }) => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQuiz, setNewQuiz] = useState({ title: "", timeLimit: 30 });
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "quizzes"), where("authorId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [user]);

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, "quizzes"), {
        ...newQuiz,
        status: "closed",
        authorId: user.uid,
        createdAt: serverTimestamp(),
        questionCount: 0
      });
      setShowCreateModal(false);
      navigate(`/teacher/quiz/${docRef.id}`);
    } catch (error) {
      console.error("Error creating quiz:", error);
    }
  };

  const toggleStatus = async (quiz: any) => {
    try {
      await updateDoc(doc(db, "quizzes", quiz.id), {
        status: quiz.status === "open" ? "closed" : "open"
      });
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const deleteQuiz = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bài kiểm tra này?")) {
      try {
        await deleteDoc(doc(db, "quizzes", id));
      } catch (error) {
        console.error("Error deleting quiz:", error);
      }
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center">
        <div className="max-w-sm w-full text-center space-y-6 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto text-indigo-600">
            <UserIcon size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Khu vực Giảng viên</h2>
          <p className="text-gray-600">Vui lòng đăng nhập bằng Google để quản lý bài kiểm tra của bạn.</p>
          <button 
            onClick={loginWithGoogle}
            className="w-full py-3 bg-white border-2 border-gray-200 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Đăng nhập với Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý Bài kiểm tra</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all"
        >
          <Plus size={20} />
          Tạo bài mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-4">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{quiz.title}</h3>
              <span className={cn(
                "px-2 py-1 rounded-md text-xs font-bold uppercase",
                quiz.status === "open" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
              )}>
                {quiz.status === "open" ? "Đang mở" : "Đã đóng"}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{quiz.timeLimit} phút</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText size={14} />
                <span>{quiz.questionCount || 0} câu hỏi</span>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate(`/teacher/quiz/${quiz.id}`)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                  title="Xem chi tiết"
                >
                  <Eye size={20} />
                </button>
                <button 
                  onClick={() => toggleStatus(quiz)}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    quiz.status === "open" ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"
                  )}
                  title={quiz.status === "open" ? "Đóng bài" : "Mở bài"}
                >
                  {quiz.status === "open" ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button 
                  onClick={() => deleteQuiz(quiz.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Xóa"
                >
                  <Trash2 size={20} />
                </button>
              </div>
              <Link 
                to={`/teacher/quiz/${quiz.id}`}
                className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:underline"
              >
                Kết quả & Thống kê
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full space-y-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900">Tạo Bài kiểm tra Mới</h2>
            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Tên bài kiểm tra</label>
                <input 
                  type="text" 
                  required
                  value={newQuiz.title}
                  onChange={(e) => setNewQuiz({...newQuiz, title: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ví dụ: Kiểm tra giữa kỳ AI"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Thời gian làm bài (phút)</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  value={newQuiz.timeLimit}
                  onChange={(e) => setNewQuiz({...newQuiz, timeLimit: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                >
                  Tạo ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Quiz Detail (Teacher) ---

const QuizDetail = ({ user }: { user: User | null }) => {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"questions" | "results" | "stats">("questions");
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!quizId) return;
    const unsubQuiz = onSnapshot(doc(db, "quizzes", quizId), (doc) => {
      setQuiz({ id: doc.id, ...doc.data() });
    });
    const unsubQuestions = onSnapshot(collection(db, "quizzes", quizId, "questions"), (snapshot) => {
      setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubResults = onSnapshot(collection(db, "quizzes", quizId, "results"), (snapshot) => {
      setResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => {
      unsubQuiz();
      unsubQuestions();
      unsubResults();
    };
  }, [quizId]);

  const handleAiGenerate = async () => {
    if (!aiTopic || !quizId) return;
    setLoading(true);
    try {
      const response = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: aiTopic, count: aiCount })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Save to Firestore
      for (const q of data) {
        await addDoc(collection(db, "quizzes", quizId, "questions"), q);
      }
      
      await updateDoc(doc(db, "quizzes", quizId), {
        questionCount: questions.length + data.length
      });
      
      setAiTopic("");
      alert(`Đã tạo thành công ${data.length} câu hỏi!`);
    } catch (error) {
      console.error("AI Error:", error);
      alert("Lỗi khi tạo câu hỏi bằng AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quizId) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/parse-docx", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      for (const q of data) {
        await addDoc(collection(db, "quizzes", quizId, "questions"), q);
      }
      
      await updateDoc(doc(db, "quizzes", quizId), {
        questionCount: questions.length + data.length
      });
      
      alert(`Đã nhập thành công ${data.length} câu hỏi từ file!`);
    } catch (error) {
      console.error("Upload Error:", error);
      alert("Lỗi khi xử lý file Word.");
    } finally {
      setLoading(false);
    }
  };

  const deleteQuestion = async (qId: string) => {
    if (!quizId) return;
    try {
      await deleteDoc(doc(db, "quizzes", quizId, "questions", qId));
      await updateDoc(doc(db, "quizzes", quizId), {
        questionCount: questions.length - 1
      });
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  const exportResults = () => {
    const data = results.map((r, i) => ({
      "STT": i + 1,
      "Họ tên": r.studentName,
      "Mã sinh viên": r.studentId,
      "Điểm": r.score,
      "Thời gian nộp": new Date(r.submittedAt?.toDate()).toLocaleString("vi-VN")
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kết quả");
    XLSX.writeFile(wb, `Ket_qua_${quiz?.title}.xlsx`);
  };

  if (!quiz) return <div className="p-8 text-center">Đang tải...</div>;

  const quizUrl = `${window.location.origin}/quiz/${quizId}`;

  // Stats calculations
  const scoreDistribution = Array.from({ length: 11 }, (_, i) => ({
    range: `${i}`,
    count: results.filter(r => Math.round(r.score) === i).length
  }));

  const passCount = results.filter(r => r.score >= 5).length;
  const failCount = results.length - passCount;
  const pieData = [
    { name: "Đạt", value: passCount, color: "#10b981" },
    { name: "Không đạt", value: failCount, color: "#ef4444" }
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/teacher")} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{quiz.title}</h1>
            <p className="text-gray-500">Mã bài: <span className="font-mono font-bold">{quizId}</span></p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(quizUrl);
              alert("Đã sao chép đường link!");
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Share2 size={18} />
            Chia sẻ link
          </button>
          <button 
            onClick={exportResults}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download size={18} />
            Xuất Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center text-center space-y-4">
            <h3 className="font-bold text-gray-900">Mã QR Bài kiểm tra</h3>
            <div className="p-4 bg-white border border-gray-100 rounded-xl">
              <QRCodeSVG value={quizUrl} size={160} />
            </div>
            <p className="text-xs text-gray-400">Sinh viên quét mã này để làm bài</p>
          </div>

          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 space-y-4">
            <h3 className="font-bold text-indigo-900 flex items-center gap-2">
              <Sparkles size={18} />
              Tạo câu hỏi AI
            </h3>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Chủ đề (ví dụ: Machine Learning)" 
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-indigo-700">Số lượng:</span>
                <input 
                  type="number" 
                  min="1" max="20"
                  value={aiCount}
                  onChange={(e) => setAiCount(parseInt(e.target.value))}
                  className="w-16 px-2 py-1 text-sm border border-indigo-200 rounded-lg"
                />
              </div>
              <button 
                onClick={handleAiGenerate}
                disabled={loading || !aiTopic}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "Đang tạo..." : "Tự động tạo"}
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <FileText size={18} />
              Tải file Word
            </h3>
            <label className="block w-full cursor-pointer">
              <div className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-400 transition-all">
                <Plus size={24} />
                <span className="text-xs font-medium mt-1">Chọn file .docx</span>
              </div>
              <input type="file" accept=".docx" className="hidden" onChange={handleFileUpload} disabled={loading} />
            </label>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex border-b border-gray-200">
            <button 
              onClick={() => setActiveTab("questions")}
              className={cn(
                "px-6 py-3 font-bold text-sm transition-all border-b-2",
                activeTab === "questions" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              Câu hỏi ({questions.length})
            </button>
            <button 
              onClick={() => setActiveTab("results")}
              className={cn(
                "px-6 py-3 font-bold text-sm transition-all border-b-2",
                activeTab === "results" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              Kết quả ({results.length})
            </button>
            <button 
              onClick={() => setActiveTab("stats")}
              className={cn(
                "px-6 py-3 font-bold text-sm transition-all border-b-2",
                activeTab === "stats" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              Thống kê
            </button>
          </div>

          {activeTab === "questions" && (
            <div className="space-y-4">
              {questions.length === 0 ? (
                <div className="py-20 text-center text-gray-400">Chưa có câu hỏi nào. Hãy tạo bằng AI hoặc tải file Word.</div>
              ) : (
                questions.map((q, i) => (
                  <div key={q.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-gray-900">Câu {i + 1}: {q.text}</h4>
                      <button onClick={() => deleteQuestion(q.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(q.options).map(([key, val]) => (
                        <div key={key} className={cn(
                          "px-4 py-2 rounded-lg border text-sm",
                          q.correctAnswer === key ? "bg-green-50 border-green-200 text-green-700 font-bold" : "bg-gray-50 border-gray-100 text-gray-600"
                        )}>
                          <span className="mr-2">{key}.</span> {val as string}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "results" && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                    <th className="px-6 py-4">STT</th>
                    <th className="px-6 py-4">Sinh viên</th>
                    <th className="px-6 py-4">Mã SV</th>
                    <th className="px-6 py-4">Điểm</th>
                    <th className="px-6 py-4">Thời gian nộp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">Chưa có sinh viên nào nộp bài.</td></tr>
                  ) : (
                    results.map((r, i) => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-all">
                        <td className="px-6 py-4 text-sm text-gray-500">{i + 1}</td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{r.studentName}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{r.studentId}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded-md text-sm font-bold",
                            r.score >= 5 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          )}>
                            {r.score.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {r.submittedAt?.toDate ? new Date(r.submittedAt.toDate()).toLocaleString("vi-VN") : "N/A"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "stats" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                  <h4 className="font-bold text-gray-900">Phân bố điểm số</h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scoreDistribution}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="range" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                  <h4 className="font-bold text-gray-900">Tỷ lệ Đạt / Không đạt</h4>
                  <div className="h-64 w-full flex items-center justify-center">
                    {results.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-gray-400">Chưa có dữ liệu</div>
                    )}
                  </div>
                  <div className="flex justify-center gap-6 text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span>Đạt: {passCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span>Không đạt: {failCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Student Quiz Interface ---

const StudentQuiz = () => {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [studentInfo, setStudentInfo] = useState({ name: "", id: "" });
  const [isStarted, setIsStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasAlreadyTaken, setHasAlreadyTaken] = useState(false);

  useEffect(() => {
    if (!quizId) return;
    const fetchQuiz = async () => {
      const qDoc = await getDoc(doc(db, "quizzes", quizId));
      if (qDoc.exists()) {
        const data = qDoc.data();
        setQuiz({ id: qDoc.id, ...data });
        setTimeLeft(data.timeLimit * 60);
        
        const qSnap = await getDocs(collection(db, "quizzes", quizId, "questions"));
        setQuestions(qSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
      setLoading(false);
    };
    fetchQuiz();
  }, [quizId]);

  useEffect(() => {
    if (isStarted && timeLeft > 0 && !isSubmitted) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isStarted, timeLeft, isSubmitted]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentInfo.name || !studentInfo.id) return;

    // Check if student already took this quiz
    const q = query(
      collection(db, "quizzes", quizId!, "results"), 
      where("studentId", "==", studentInfo.id)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      setHasAlreadyTaken(true);
      return;
    }

    setIsStarted(true);
  };

  const handleSubmit = async () => {
    if (isSubmitted) return;
    setIsSubmitted(true);

    // Calculate score
    let correctCount = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });
    const score = (correctCount / questions.length) * 10;

    const resData = {
      studentName: studentInfo.name,
      studentId: studentInfo.id,
      score,
      answers: Object.values(answers),
      submittedAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, "quizzes", quizId!, "results"), resData);
      setResult(resData);
    } catch (error) {
      console.error("Error submitting quiz:", error);
    }
  };

  if (loading) return <div className="p-20 text-center">Đang tải bài kiểm tra...</div>;
  if (!quiz) return <div className="p-20 text-center text-red-500 font-bold">Không tìm thấy bài kiểm tra này.</div>;
  if (quiz.status !== "open" && !isSubmitted) return <div className="p-20 text-center text-orange-500 font-bold">Bài kiểm tra này hiện đang đóng.</div>;

  if (hasAlreadyTaken) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100 text-center space-y-4">
          <XCircle size={64} className="text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900">Bạn đã làm bài này rồi</h2>
          <p className="text-gray-600">Mỗi sinh viên chỉ được phép làm bài kiểm tra một lần duy nhất.</p>
          <Link to="/" className="inline-block px-6 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold">Quay lại trang chủ</Link>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl space-y-8">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-indigo-100 text-center space-y-6">
          <CheckCircle2 size={80} className="text-green-500 mx-auto" />
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">Hoàn thành bài kiểm tra!</h2>
            <p className="text-gray-500">Cảm ơn {studentInfo.name} đã tham gia.</p>
          </div>
          <div className="py-6 bg-indigo-50 rounded-2xl">
            <span className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Điểm số của bạn</span>
            <div className="text-6xl font-black text-indigo-900 mt-2">{result?.score.toFixed(1)}</div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Xem lại bài làm</h3>
          {questions.map((q, i) => {
            const studentAns = answers[q.id];
            const isCorrect = studentAns === q.correctAnswer;
            return (
              <div key={q.id} className={cn(
                "bg-white p-6 rounded-2xl border shadow-sm space-y-4",
                isCorrect ? "border-green-100" : "border-red-100"
              )}>
                <div className="flex items-start justify-between gap-4">
                  <h4 className="font-bold text-gray-900">Câu {i + 1}: {q.text}</h4>
                  {isCorrect ? (
                    <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                  ) : (
                    <XCircle size={20} className="text-red-500 shrink-0" />
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(q.options).map(([key, val]) => (
                    <div key={key} className={cn(
                      "px-4 py-2 rounded-lg border text-sm",
                      key === q.correctAnswer ? "bg-green-50 border-green-200 text-green-700 font-bold" : 
                      key === studentAns ? "bg-red-50 border-red-200 text-red-700" : "bg-gray-50 border-gray-100 text-gray-400"
                    )}>
                      <span className="mr-2">{key}.</span> {val as string}
                    </div>
                  ))}
                </div>
                {!isCorrect && (
                  <div className="text-sm font-medium text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                    Đáp án đúng: <span className="font-bold">{q.correctAnswer}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">{quiz.title}</h2>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{quiz.timeLimit} phút</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText size={14} />
                <span>{questions.length} câu hỏi</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleStart} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Họ và tên</label>
              <input 
                type="text" 
                required
                value={studentInfo.name}
                onChange={(e) => setStudentInfo({...studentInfo, name: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Nhập đầy đủ họ tên"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Mã sinh viên</label>
              <input 
                type="text" 
                required
                value={studentInfo.id}
                onChange={(e) => setStudentInfo({...studentInfo, id: e.target.value})}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ví dụ: SV123456"
              />
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              Bắt đầu làm bài
            </button>
          </form>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const allAnswered = questions.every(q => answers[q.id]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-bold text-gray-900 truncate max-w-[200px] md:max-w-md">{quiz.title}</div>
          <div className={cn(
            "px-4 py-2 rounded-full font-mono font-bold text-lg flex items-center gap-2",
            timeLeft < 60 ? "bg-red-100 text-red-600 animate-pulse" : "bg-indigo-100 text-indigo-600"
          )}>
            <Clock size={20} />
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {questions.map((q, i) => (
          <div key={q.id} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
            <h3 className="text-lg font-bold text-gray-900">Câu {i + 1}: {q.text}</h3>
            <div className="grid grid-cols-1 gap-3">
              {Object.entries(q.options).map(([key, val]) => (
                <button 
                  key={key}
                  onClick={() => setAnswers({...answers, [q.id]: key})}
                  className={cn(
                    "w-full px-6 py-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4",
                    answers[q.id] === key 
                      ? "border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm" 
                      : "border-gray-100 hover:border-gray-200 text-gray-600"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0",
                    answers[q.id] === key ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400"
                  )}>
                    {key}
                  </div>
                  <span className="font-medium">{val as string}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {allAnswered && (
          <div className="pt-8">
            <button 
              onClick={handleSubmit}
              className="w-full py-5 bg-green-600 text-white rounded-3xl font-black text-xl hover:bg-green-700 shadow-xl shadow-green-100 transition-all active:scale-95"
            >
              Nộp bài sớm
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang khởi động...</div>;

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
        <Navbar user={user} />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/teacher" element={<TeacherDashboard user={user} />} />
            <Route path="/teacher/quiz/:quizId" element={<QuizDetail user={user} />} />
            <Route path="/quiz/:quizId" element={<StudentQuiz />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
