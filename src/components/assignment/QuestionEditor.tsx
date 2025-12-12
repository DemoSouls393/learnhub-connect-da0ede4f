import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import type { Tables, Json } from "@/integrations/supabase/types";

type Question = Tables<"questions">;

interface QuestionEditorProps {
  assignmentId: string;
  orderIndex: number;
  question?: Question;
  onClose: () => void;
  onSave: () => void;
}

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

const QuestionEditor = ({ assignmentId, orderIndex, question, onClose, onSave }: QuestionEditorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [questionType, setQuestionType] = useState(question?.question_type || "multiple_choice");
  const [questionText, setQuestionText] = useState(question?.question_text || "");
  const [points, setPoints] = useState(question?.points || 1);
  const [options, setOptions] = useState<Option[]>(() => {
    if (question?.options && Array.isArray(question.options)) {
      return question.options as unknown as Option[];
    }
    return [
      { id: "1", text: "", isCorrect: false },
      { id: "2", text: "", isCorrect: false },
      { id: "3", text: "", isCorrect: false },
      { id: "4", text: "", isCorrect: false },
    ];
  });
  const [correctAnswer, setCorrectAnswer] = useState(question?.correct_answer || "");

  const handleAddOption = () => {
    setOptions([...options, { id: Date.now().toString(), text: "", isCorrect: false }]);
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) {
      toast({
        title: "Lỗi",
        description: "Cần ít nhất 2 đáp án",
        variant: "destructive",
      });
      return;
    }
    setOptions(options.filter(o => o.id !== id));
  };

  const handleOptionChange = (id: string, text: string) => {
    setOptions(options.map(o => o.id === id ? { ...o, text } : o));
  };

  const handleCorrectChange = (id: string) => {
    setOptions(options.map(o => ({ ...o, isCorrect: o.id === id })));
  };

  const handleSave = async () => {
    if (!questionText.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập câu hỏi",
        variant: "destructive",
      });
      return;
    }

    if (questionType === "multiple_choice") {
      const hasCorrect = options.some(o => o.isCorrect);
      const hasEmptyOption = options.some(o => !o.text.trim());
      
      if (hasEmptyOption) {
        toast({
          title: "Lỗi",
          description: "Vui lòng nhập đầy đủ các đáp án",
          variant: "destructive",
        });
        return;
      }

      if (!hasCorrect) {
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn đáp án đúng",
          variant: "destructive",
        });
        return;
      }
    }

    if (questionType === "true_false" && !correctAnswer) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn đáp án đúng (Đúng/Sai)",
        variant: "destructive",
      });
      return;
    }

    if (questionType === "short_answer" && !correctAnswer.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập đáp án đúng",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const correctOptionId = options.find(o => o.isCorrect)?.id || "";
      
      const questionData = {
        assignment_id: assignmentId,
        question_type: questionType,
        question_text: questionText,
        points,
        order_index: orderIndex,
        options: questionType === "multiple_choice" ? (options as unknown as Json) : null,
        correct_answer: questionType === "multiple_choice" ? correctOptionId : correctAnswer,
      };

      if (question) {
        const { error } = await supabase
          .from("questions")
          .update(questionData)
          .eq("id", question.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("questions")
          .insert(questionData);
        if (error) throw error;
      }

      toast({
        title: "Thành công",
        description: question ? "Đã cập nhật câu hỏi" : "Đã thêm câu hỏi",
      });
      onSave();
    } catch (error) {
      console.error("Error saving question:", error);
      toast({
        title: "Lỗi",
        description: "Không thể lưu câu hỏi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{question ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi mới"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Loại câu hỏi</Label>
              <Select value={questionType} onValueChange={setQuestionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Trắc nghiệm</SelectItem>
                  <SelectItem value="true_false">Đúng/Sai</SelectItem>
                  <SelectItem value="short_answer">Trả lời ngắn</SelectItem>
                  <SelectItem value="essay">Tự luận</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Điểm</Label>
              <Input
                type="number"
                min={1}
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Câu hỏi</Label>
            <Textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Nhập nội dung câu hỏi..."
              rows={3}
            />
          </div>

          {questionType === "multiple_choice" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Các đáp án</Label>
                <Button variant="outline" size="sm" onClick={handleAddOption}>
                  <Plus className="h-4 w-4 mr-1" />
                  Thêm đáp án
                </Button>
              </div>

              {options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="correct"
                    checked={option.isCorrect}
                    onChange={() => handleCorrectChange(option.id)}
                    className="h-4 w-4 text-primary"
                  />
                  <span className="text-sm font-medium w-6">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <Input
                    value={option.text}
                    onChange={(e) => handleOptionChange(option.id, e.target.value)}
                    placeholder={`Đáp án ${String.fromCharCode(65 + index)}`}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOption(option.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <p className="text-sm text-muted-foreground">
                * Chọn radio button bên trái để đánh dấu đáp án đúng
              </p>
            </div>
          )}

          {questionType === "true_false" && (
            <div className="space-y-2">
              <Label>Đáp án đúng</Label>
              <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn đáp án" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Đúng</SelectItem>
                  <SelectItem value="false">Sai</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {questionType === "short_answer" && (
            <div className="space-y-2">
              <Label>Đáp án đúng</Label>
              <Input
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                placeholder="Nhập đáp án đúng"
              />
            </div>
          )}

          {questionType === "essay" && (
            <p className="text-sm text-muted-foreground">
              Câu hỏi tự luận sẽ được giáo viên chấm điểm thủ công.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Đang lưu..." : "Lưu câu hỏi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionEditor;
