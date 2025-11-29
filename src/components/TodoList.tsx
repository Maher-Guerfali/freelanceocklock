import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoListProps {
  user: SupabaseUser | null;
}

export const TodoList = ({ user }: TodoListProps) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Load todos from Supabase when user logs in
  const loadTodosFromSupabase = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        console.log('[Todos] Loaded from Supabase:', data.length);
        const loadedTodos: TodoItem[] = data.map(todo => ({
          id: todo.id,
          text: todo.text,
          completed: todo.completed,
        }));
        setTodos(loadedTodos);
      }
    } catch (error: any) {
      console.error('Failed to load todos:', error);
    }
  };

  // Sync todos to Supabase
  const syncTodosToSupabase = async (todosToSync: TodoItem[]) => {
    if (!user) return;
    
    try {
      console.log('[Todos] Syncing to Supabase (bulk):', todosToSync.length);
      // Delete all existing todos for this user
      await supabase
        .from('todos')
        .delete()
        .eq('user_id', user.id);
      
      // Insert all current todos
      if (todosToSync.length > 0) {
        const { error } = await supabase
          .from('todos')
          .insert(
            todosToSync.map(todo => ({
              id: todo.id,
              user_id: user.id,
              text: todo.text,
              completed: todo.completed,
            }))
          );
        
        if (error) throw error;
        console.log('[Todos] Bulk sync complete');
      }
    } catch (error: any) {
      console.error('Failed to sync todos:', error);
    }
  };

  // Load from localStorage or Supabase on mount
  useEffect(() => {
    if (user) {
      (async () => {
        await loadTodosFromSupabase();
        setInitialLoaded(true);
      })();
    } else {
      const saved = localStorage.getItem("todos");
      if (saved) {
        setTodos(JSON.parse(saved));
      }
      setInitialLoaded(true);
    }
  }, [user]);

  // Save to localStorage when todos change (not logged in)
  useEffect(() => {
    if (!initialLoaded) return; // avoid race on mount
    if (!user) {
      localStorage.setItem("todos", JSON.stringify(todos));
    }
    // When logged in, we use per-item writes (add/toggle/delete) instead of bulk sync
  }, [todos, user, initialLoaded]);

  const addTodo = () => {
    if (newTodo.trim()) {
      const newItem = { id: Date.now().toString(), text: newTodo.trim(), completed: false };
      setTodos([...todos, newItem]);
      // Immediately persist to Supabase when logged in
      if (user) {
        console.log('[Todos] Adding to Supabase:', newItem);
        supabase
          .from('todos')
          .upsert({ id: newItem.id, user_id: user.id, text: newItem.text, completed: newItem.completed })
          .then(({ error }) => {
            if (error) {
              console.error('Failed to add todo to cloud:', error);
            } else {
              console.log('[Todos] Added to cloud');
            }
          });
      }
      setNewTodo("");
    }
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    setTodos(updated);
    // Persist change to Supabase when logged in
    if (user) {
      const changed = updated.find(t => t.id === id);
      if (changed) {
        console.log('[Todos] Updating in Supabase:', changed);
        supabase
          .from('todos')
          .upsert({ id: changed.id, user_id: user.id, text: changed.text, completed: changed.completed })
          .then(({ error }) => {
            if (error) {
              console.error('Failed to update todo in cloud:', error);
            } else {
              console.log('[Todos] Updated in cloud');
            }
          });
      }
    }
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
    // Also delete from Supabase when logged in
    if (user) {
      console.log('[Todos] Deleting from Supabase:', id);
      supabase
        .from('todos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('Failed to delete todo from cloud:', error);
          } else {
            console.log('[Todos] Deleted from cloud');
          }
        });
    }
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
