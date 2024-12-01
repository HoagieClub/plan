export interface ActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: {
    fill: string;
    background: string;
  };
  cursor?: React.CSSProperties['cursor'];
  children: React.ReactNode;
}
