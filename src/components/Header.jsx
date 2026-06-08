export default function Header() {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-logo">🎬 Cheonan Travel</div>
        <div className="header-title">Video Manager</div>
        <div className="header-hint">
          <kbd>F</kbd> добавить &nbsp;
          <kbd>I</kbd> in &nbsp;
          <kbd>O</kbd> out &nbsp;
          <kbd>R</kbd> сброс &nbsp;
          <kbd>D</kbd> удалить
        </div>
      </div>
    </header>
  );
}
