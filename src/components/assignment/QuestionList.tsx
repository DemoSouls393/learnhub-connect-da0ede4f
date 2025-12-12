import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, GripVertical } from "lucide-react";
import QuestionEditor from "./QuestionEditor";
import type { Tables } from "@/integrations/supabase/types";

type Question = Tables<"questions">;

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuestionListProps {
  questions: Question[];
  assignmentId: string;
  onUpdate: () => void;
}

const QuestionList = ({ questions, assignmentId, onUpdate }: QuestionListProps) => {
  const { toast } = useToast();
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const handleDelete = async (questionId: string) => {
    if (!confirm("Bạn có chắc muốn xóa câu hỏi này?")) return;

    try {
      const { error } = await supabase
        .from("questions")
        .delete()
        .eq("id", questionId);

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Đã xóa câu hỏi",
      });
      onUpdate();
    } catch (error) {
      console.error("Error deleting question:", error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa câu hỏi",
        variant: "destructive",
      });
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      multiple_choice: "Trắc nghiệm",
      true_false: "Đúng/Sai",
      short_answer: "Trả lời ngắn",
      essay: "Tự luận",
    };
    return labels[type] || type;
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Chưa có câu hỏi nào</p>
        <p className="text-sm">Nhấn "Thêm câu hỏi" để bắt đầu</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <div
          key={question.id}
          className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <GripVertical className="h-5 w-5 cursor-move" />
              <span className="font-bold text-lg">{index + 1}</span>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{getQuestionTypeLabel(question.question_type)}</Badge>
                <Badge variant="secondary">{question.points} điểm</Badge>
              </div>

              <p className="font-medium mb-3">{question.question_text}</p>

              {question.question_type === "multiple_choice" && question.options && (
                <div className="space-y-2 ml-4">
                  {(question.options as unknown as Option[]).map((option, optIndex) => (
                    <div
                      key={option.id}
                      className={`flex items-center gap-2 p-2 rounded ${
                        option.isCorrect ? "bg-success/10 text-success" : ""
                      }`}
                    >
                      <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span>
                      <span>{option.text}</span>
                      {option.isCorrect && (
                        <Badge variant="default" className="ml-auto bg-success">Đáp án đúng</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {question.question_type === "true_false" && (
                <p className="text-sm text-muted-foreground ml-4">
                  Đáp án đúng: <span className="font-medium">{question.correct_answer === "true" ? "Đúng" : "Sai"}</span>
                </p>
              )}

              {question.question_type === "short_answer" && question.correct_answer && (
                <p className="text-sm text-muted-foreground ml-4">
                  Đáp án: <span className="font-medium">{question.correct_answer}</span>
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingQuestion(question)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(question.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      ))}

      {editingQuestion && (
        <QuestionEditor
          assignmentId={assignmentId}
          orderIndex={editingQuestion.order_index}
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSave={() => {
            setEditingQuestion(null);
            onUpdate();
          }}
        />
      )}
    </div>
  );
};

export default QuestionList;
