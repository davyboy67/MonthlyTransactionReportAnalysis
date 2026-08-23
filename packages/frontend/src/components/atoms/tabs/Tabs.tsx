import { useRef } from "react";
import "./Tabs.css";

interface Tab<T extends string> {
  id: T;
  label: string;
}

interface TabsProps<T extends string> {
  tabs: Array<Tab<T>>;
  activeTab: T;
  onTabChange: (id: T) => void;
}

export function Tabs<T extends string>({ tabs, activeTab, onTabChange }: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();

    const current = tabs.findIndex(t => t.id === activeTab);
    let next = current;
    if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
    if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;

    onTabChange(tabs[next].id);
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(".tabs__tab");
    buttons?.[next]?.focus();
  };

  return (
    <div className="tabs" role="tablist" ref={listRef} onKeyDown={handleKeyDown}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            className={`tabs__tab${isActive ? " tabs__tab--active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
