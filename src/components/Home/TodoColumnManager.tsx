"use client";

import useBreakpoint from "@/hooks/useBreakpoint";
import { TASK_STATE_OPTIONS } from "@/lib/const";
import { deepCopy, throttle } from "@/lib/helper";
import { TodoEditRequest } from "@/lib/validators/todo";
import { TodoType } from "@/model/Todo";
import axios, { AxiosError } from "axios";
import { ObjectId } from "mongodb";
import { useRouter } from "next/navigation";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "react-query";
import DndContextProvider from "../DnDContextProvider";
import { useToast } from "../ui/use-toast";
import Carousel from "./Carousel";
import CarouselButton from "./CarouselButton";
import TodoColumn from "./TodoColumn";

type TodoColumnManagerProp = {
  todos: TodoType[];
};

const TodoColumnManager: FC<TodoColumnManagerProp> = ({ todos }) => {
  const { md } = useBreakpoint();
  const [value, setValue] = useState(0);
  const [childrenWidth, setChildrenWidth] = useState(0);
  const [todoColumeObj, setTodoColumeObj] = useState<
    Record<TodoType["state"], TodoType[]> | {}
  >({});
  const carouselRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { axiosToast } = useToast();

  useEffect(() => {
    const initTodoColumeObj = TASK_STATE_OPTIONS.reduce((acc, { value }) => {
      acc[value] = [];
      return acc;
    }, {});
    const todoColumeObj = todos.reduce((acc, todo) => {
      if (!Object.prototype.hasOwnProperty.call(acc, todo.state)) {
        acc[todo.state] = [todo];
      } else {
        acc[todo.state].push(todo);
      }
      return acc;
    }, initTodoColumeObj);
    setTodoColumeObj(todoColumeObj);
  }, [todos]);

  useEffect(() => {
    const updateWidth = () => {
      if (!carouselRef.current || md) return;
      const { width } = carouselRef.current.getBoundingClientRect();
      setChildrenWidth(width);
    };
    updateWidth();

    window.addEventListener("resize", updateWidth);

    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, [md]);

  const { mutate: handleUpdateState } = useMutation({
    mutationFn: async ({ id, state }: TodoEditRequest) => {
      const result = await axios.patch("/api/todo/edit", { id, state });
      return result;
    },
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
    onError: (error: AxiosError) => {
      axiosToast(error);
    },
  });

  const handleSlideTo = (index: number) => {
    setValue(index);
  };

  const handleDragEnd = async (dragEndEvent) => {
    const { over, from, item } = dragEndEvent;
    if (over === from || !over || !from) return;

    const payload = {
      id: item,
      state: over,
    };

    await handleUpdateState(payload);
  };

  const scrollLeft = useMemo(
    () =>
      throttle(() => {
        let scrolled = true;
        setValue((prev) => {
          if (prev === 0) {
            scrolled = false;
            return prev;
          }
          return prev - 1;
        });
        return scrolled;
      }, 1000) as () => boolean,
    [],
  );
  const scrollRight = useMemo(
    () =>
      throttle(() => {
        let scrolled = true;
        setValue((prev) => {
          if (prev === TASK_STATE_OPTIONS.length - 1) {
            scrolled = false;
            return prev;
          }
          return prev + 1;
        });
        return scrolled;
      }, 1000) as () => boolean,
    [],
  );

  const handleDragging = useMemo(
    () => (e: MouseEvent | React.MouseEvent<HTMLDivElement>) => {
      if (typeof md === "undefined" || md) return false;
      // check if the mouse is at the edge of the screen
      if (e.clientX < 20) {
        return scrollLeft();
      } else if (e.clientX > window.innerWidth - 20) {
        return scrollRight();
      }
      return false;
    },
    [md, scrollLeft, scrollRight],
  );

  return (
    <DndContextProvider onDragEnd={handleDragEnd}>
      {typeof md === "undefined" || md ? (
        <div className="h-[90%] flex gap-2">
          {TASK_STATE_OPTIONS.map(({ value, title }) => {
            return (
              <TodoColumn
                key={value}
                title={title}
                todos={todoColumeObj[value] ?? []}
                state={value}
              />
            );
          })}
        </div>
      ) : (
        <div className="h-[85%]" ref={carouselRef}>
          <Carousel value={value} gap={32} childrenWidth={childrenWidth}>
            {TASK_STATE_OPTIONS.map(({ value, title }) => {
              return (
                <TodoColumn
                  key={value}
                  title={title}
                  todos={todoColumeObj[value] ?? []}
                  state={value}
                  handleDragging={handleDragging}
                />
              );
            })}
          </Carousel>
          <CarouselButton
            to={handleSlideTo}
            numberOfSlides={TASK_STATE_OPTIONS.length}
            current={value}
          />
        </div>
      )}
    </DndContextProvider>
  );
};

export default TodoColumnManager;
