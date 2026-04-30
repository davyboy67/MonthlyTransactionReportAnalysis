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
  return (
    <nav className="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tabs__tab${activeTab === tab.id ? " tabs__tab--active" : ""}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
