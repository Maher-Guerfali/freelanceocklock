import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export const TodoList = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("todos");
    if (saved) {
      setTodos(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    if (newTodo.trim()) {
      setTodos([...todos, { id: Date.now().toString(), text: newTodo, completed: false }]);
      setNewTodo("");
    }
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-3xl font-black text-primary flex items-center gap-3">
        ✅ Todo List
      </h3>
      
      <div className="flex gap-3">
        <Input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          placeholder="Add a new task..."
          className="flex-1 text-lg h-14 bg-input border-2 border-primary/20 focus:border-primary rounded-2xl font-medium"
        />
        <Button onClick={addTodo} size="lg" className="shrink-0 h-14 w-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-md hover:scale-105 transition-transform">
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      <div className="space-y-3">
        {todos.map((todo) => (
          <div key={todo.id} className="flex items-center gap-4 p-5 bg-secondary/30 rounded-2xl border-2 border-secondary/40 hover:shadow-lg transition-all hover:scale-[1.02] animate-fade-in">
            <Checkbox
              checked={todo.completed}
              onCheckedChange={() => toggleTodo(todo.id)}
              className="shrink-0 h-6 w-6 border-2"
            />
            <span className={`flex-1 text-lg transition-all ${todo.completed ? "line-through text-muted-foreground" : "text-foreground font-semibold"}`}>
              {todo.text}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteTodo(todo.id)}
              className="shrink-0 h-10 w-10 rounded-2xl text-muted-foreground hover:text-destructive hover:scale-110 hover:bg-destructive/10 transition-all"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        ))}
        
        {todos.length === 0 && (
          <p className="text-center text-muted-foreground py-12 text-lg font-medium">No tasks yet. Add one above!</p>
        )}
      </div>
    </div>
  );
};
