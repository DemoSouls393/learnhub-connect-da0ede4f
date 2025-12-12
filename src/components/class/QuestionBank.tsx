import { useState, useEffect } from "react";
import { Plus, Search, Filter, Copy, Trash2, Edit, BookOpen, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Json } from "@/integrations/supabase/types";

type Question = Tables<"questions">;

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuestionBankProps {
  classId: string;
  targetAssignmentId?: string;
  onSelectQuestions?: (questions: Question[]) => void;
}

export default function QuestionBank({ classId, targetAssignmentId, onSelectQuestions }: QuestionBankProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assignments, setAssignments] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterAssignment, setFilterAssignment] = useState<string>("all");
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [copyTargetAssignment, setCopyTargetAssignment] = useState("");
  const [isCopying, setIsCopying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [classId]);

  const fetchData = async () => {
    try {
      // Fetch all assignments for this class
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select("id, title")
        .eq("class_id", classId)
        .order("created_at", { ascending: false });

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

      // Fetch all questions from these assignments
      if (assignmentsData && assignmentsData.length > 0) {
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select("*")
          .in("assignment_id", assignmentsData.map(a => a.id))
          .order("created_at", { ascending: false });

        if (questionsError) throw questionsError;
        setQuestions(questionsData || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyQuestions = async () => {
    if (!copyTargetAssignment || selectedQuestions.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn bài tập đích",
        variant: "destructive",
      });
      return;
    }

    setIsCopying(true);
    try {
      // Get current max order_index for target assignment
      const { data: existingQuestions } = await supabase
        .from("questions")
        .select("order_index")
        .eq("assignment_id", copyTargetAssignment)
        .order("order_index", { ascending: false })
        .limit(1);

      const maxOrderIndex = existingQuestions?.[0]?.order_index || 0;

      // Get selected questions data
      const selectedQuestionsData = questions.filter(q => selectedQuestions.includes(q.id));

      // Insert copies
      const copies = selectedQuestionsData.map((q, index) => ({
        assignment_id: copyTargetAssignment,
        question_type: q.question_type,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        points: q.points,
        order_index: maxOrderIndex + index + 1,
      }));

      const { error } = await supabase.from("questions").insert(copies);
      if (error) throw error;

      toast({
        title: "Thành công",
        description: `Đã sao chép ${copies.length} câu hỏi`,
      });
      setSelectedQuestions([]);
      setIsCopyDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Bạn có chắc muốn xóa câu hỏi này?")) return;

    try {
      const { error } = await supabase.from("questions").delete().eq("id", questionId);
      if (error) throw error;
      setQuestions(questions.filter(q => q.id !== questionId));
      toast({ title: "Thành công", description: "Đã xóa câu hỏi" });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleSelectQuestion = (questionId: string) => {
    setSelectedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedQuestions.length === filteredQuestions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(filteredQuestions.map(q => q.id));
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case "multiple_choice": return "Trắc nghiệm";
      case "true_false": return "Đúng/Sai";
      case "short_answer": return "Trả lời ngắn";
      case "essay": return "Tự luận";
      default: return type;
    }
  };

  const getQuestionTypeBadge = (type: string) => {
    switch (type) {
      case "multiple_choice": return "default";
      case "true_false": return "secondary";
      case "short_answer": return "outline";
      case "essay": return "destructive";
      default: return "default";
    }
  };

  const getAssignmentTitle = (assignmentId: string) => {
    return assignments.find(a => a.id === assignmentId)?.title || "Không xác định";
  };

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || q.question_type === filterType;
    const matchesAssignment = filterAssignment === "all" || q.assignment_id === filterAssignment;
    return matchesSearch && matchesType && matchesAssignment;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Ngân hàng câu hỏi
          </h2>
          <p className="text-muted-foreground">
            {questions.length} câu hỏi từ {assignments.length} bài tập
          </p>
        </div>
        {selectedQuestions.length > 0 && (
          <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Copy className="h-4 w-4 mr-2" />
                Sao chép {selectedQuestions.length} câu hỏi
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sao chép câu hỏi</DialogTitle>
                <DialogDescription>
                  Chọn bài tập đích để sao chép {selectedQuestions.length} câu hỏi đã chọn
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label>Bài tập đích</Label>
                <Select value={copyTargetAssignment} onValueChange={setCopyTargetAssignment}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Chọn bài tập..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assignments.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCopyDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleCopyQuestions} disabled={isCopying}>
                  {isCopying ? "Đang sao chép..." : "Sao chép"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm câu hỏi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Loại câu hỏi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                <SelectItem value="multiple_choice">Trắc nghiệm</SelectItem>
                <SelectItem value="true_false">Đúng/Sai</SelectItem>
                <SelectItem value="short_answer">Trả lời ngắn</SelectItem>
                <SelectItem value="essay">Tự luận</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAssignment} onValueChange={setFilterAssignment}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Bài tập" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả bài tập</SelectItem>
                {assignments.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Select All */}
      {filteredQuestions.length > 0 && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedQuestions.length === filteredQuestions.length}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            Chọn tất cả ({filteredQuestions.length} câu hỏi)
          </span>
        </div>
      )}

      {/* Questions List */}
      {filteredQuestions.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="mx-auto mb-4 text-muted-foreground h-12 w-12" />
            <h3 className="text-lg font-semibold mb-2">Không tìm thấy câu hỏi</h3>
            <p className="text-muted-foreground">
              Thử thay đổi bộ lọc hoặc tạo câu hỏi mới trong bài tập
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((question, index) => (
            <Card
              key={question.id}
              className={`transition-all ${selectedQuestions.includes(question.id) ? "ring-2 ring-primary" : ""}`}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedQuestions.includes(question.id)}
                    onCheckedChange={() => toggleSelectQuestion(question.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant={getQuestionTypeBadge(question.question_type) as any}>
                        {getQuestionTypeLabel(question.question_type)}
                      </Badge>
                      <Badge variant="outline">{question.points} điểm</Badge>
                      <span className="text-xs text-muted-foreground">
                        Từ: {getAssignmentTitle(question.assignment_id)}
                      </span>
                    </div>
                    <p className="font-medium mb-2">{question.question_text}</p>
                    
                    {/* Show options for multiple choice */}
                    {question.question_type === "multiple_choice" && question.options && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {(question.options as unknown as Option[]).map((opt, i) => (
                          <div
                            key={opt.id}
                            className={`text-sm p-2 rounded ${opt.isCorrect ? "bg-success/10 text-success" : "bg-muted"}`}
                          >
                            {String.fromCharCode(65 + i)}. {opt.text}
                            {opt.isCorrect && <CheckCircle className="h-3 w-3 inline ml-1" />}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Show correct answer for true/false and short answer */}
                    {(question.question_type === "true_false" || question.question_type === "short_answer") && question.correct_answer && (
                      <div className="text-sm mt-2 p-2 bg-success/10 text-success rounded">
                        Đáp án: {question.question_type === "true_false" ? (question.correct_answer === "true" ? "Đúng" : "Sai") : question.correct_answer}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteQuestion(question.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
