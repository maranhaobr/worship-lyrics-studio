'use client';
import { useTranslation } from '@/components/preferences-provider';
import { PreferenceControls } from '@/components/preference-controls';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight, AudioLines, Check, ChevronDown, CirclePlay, Download, Layers3, Maximize2, Menu, Music2, Pause, Play, SlidersHorizontal, Sparkles, Type, Users, X } from 'lucide-react';

const themes = [
  { id: 'atmosphere', name: 'Atmosférico', tag: 'FEITO PARA TOCAR ALÉM DA TELA' },
  { id: 'christmas', name: 'Natal', tag: 'CELEBRE A LUZ QUE CHEGOU' },
  { id: 'easter', name: 'Páscoa', tag: 'UMA NOVA MANHÃ. UMA NOVA ESPERANÇA.' },
] as const;
const phrases = ['Uma só voz.\nUm só propósito.', 'Cada palavra,\numa expressão de fé.', 'A mensagem vive\nem cada canção.'];
const questions = [
  ['Preciso saber editar vídeos?', 'Você pode começar com a letra e um template. A plataforma organiza os slides e cria uma primeira versão com tempos estimados. Depois, ajuste os detalhes no editor visual.'],
  ['Posso sincronizar a letra com a música?', 'Sim. Envie a gravação de referência e solicite o alinhamento automático. Confira o resultado no preview e ajuste a timeline quando necessário, principalmente em versões com repetições ou interpretações diferentes.'],
  ['O vídeo exportado inclui o áudio da música?', 'O MP4 é exportado sem áudio. A gravação enviada é usada como referência para sincronização e pode ser ouvida no preview do editor.'],
  ['Funciona com o ProPresenter?', 'Você pode importar e exportar letras em arquivos .pro, com texto editável e grupos. Para levar fundos, animações e o visual completo, use o MP4 exportado.'],
  ['Posso trabalhar com a equipe da minha igreja?', 'Sim. Cada igreja tem seu próprio espaço. Convide pessoas como Administrador, Editor ou Leitor e defina quem pode criar, editar e gerenciar o conteúdo.'],
];

function Brand({ light = false }: { light?: boolean }) {
  return <span className={`m-brand ${light ? 'm-brand-light' : ''}`}><span className="m-brand-symbol"><AudioLines size={22} strokeWidth={2.5} /></span><span>worship<span className="m-brand-sub">LYRICS STUDIO</span></span></span>;
}

export function LandingPage() {
  const t = useTranslation();
  const [menu, setMenu] = useState(false);
  const [theme, setTheme] = useState<typeof themes[number]>(themes[0]);
  const [playing, setPlaying] = useState(true), [phrase, setPhrase] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!playing || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => setPhrase(value => (value + 1) % phrases.length), 3800);
    return () => clearInterval(timer);
  }, [playing]);
  useEffect(() => {
    const elements = root.current?.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!elements || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('m-visible'); observer.unobserve(entry.target); } }), { threshold: .08 });
    elements.forEach(element => { element.classList.add('m-will-reveal'); observer.observe(element); });
    return () => observer.disconnect();
  }, []);
  return <div className="marketing" ref={root}>
    <a className="m-skip" href="#conteudo">{t("Pular para o conteúdo")}</a>
    <header className="m-header"><div className="m-container m-nav">
      <Link href="/" aria-label={t("Worship Lyrics Studio, início")}><Brand /></Link>
      <nav className={menu ? "m-nav-links m-nav-open" : "m-nav-links"} aria-label={t("Navegação do site")} id="marketing-navigation">
        <a href="#recursos" onClick={() => setMenu(false)}>{t("Recursos")}</a><a href="#como-funciona" onClick={() => setMenu(false)}>{t("Como funciona")}</a><a href="#igrejas" onClick={() => setMenu(false)}>{t("Para sua igreja")}</a>
        <Link className="m-mobile-login" href="/login">{t("Entrar na plataforma ")}<ArrowRight size={16} /></Link>
      </nav>
      <div className="m-nav-actions"><PreferenceControls /><Link href="/login" className="m-login">{t("Entrar")}</Link><Link href="/register" className="m-button m-button-small">{t("Começar agora ")}<ArrowRight size={15} /></Link><button className="m-menu-toggle" aria-label={menu ? t("Fechar menu") : t("Abrir menu")} aria-expanded={menu} aria-controls="marketing-navigation" onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button></div>
    </div></header>
    <main id="conteudo">
      <section className="m-hero m-container">
        <div className="m-hero-copy"><span className="m-eyebrow"><span className="m-dot" />{t(" CRIADO PARA QUEM SERVE COM CRIATIVIDADE")}</span>
          <h1>{t("Dê vida às")}<br />{t("palavras do")}<br /><em>{t("seu louvor.")}</em></h1>
          <p>{t("Transforme letras em vídeos que conectam.")}<br className="m-desktop-break" />{t(" Mais expressão na tela. Mais tempo para o que importa.")}</p>
          <div className="m-hero-actions"><Link href="/register" className="m-button">{t("Criar conta da igreja ")}<ArrowRight size={18} /></Link><a className="m-text-link" href="#demonstracao"><CirclePlay size={21} />{t(" Ver em ação")}</a></div>
          <div className="m-hero-notes"><span><Check size={14} />{t(" Do texto ao vídeo")}</span><span><Check size={14} />{t(" Do seu jeito")}</span><span><Check size={14} />{t(" No navegador")}</span></div>
        </div>
        <div className="m-hero-art" id="demonstracao">
          <div className="m-orbit m-orbit-one" /><div className="m-orbit m-orbit-two" />
          <div className="m-floating-note"><span className="m-note-icon"><Sparkles size={16} /></span>{t(" Sua criatividade. Sem complicação.")}</div>
          <div className="m-editor">
            <div className="m-editor-toolbar"><span className="m-window-dots"><i /><i /><i /></span><span>{t("Meu próximo lyric video")}</span><span className="m-editor-status"><span />{t(" Projeto visual")}</span></div>
            <div className="m-editor-body"><div className="m-tool-rail" aria-hidden="true"><Layers3 /><Type /><Music2 /><SlidersHorizontal /></div>
              <div className="m-editor-canvas"><div className={`m-scene m-scene-${theme.id} ${playing ? '' : 'm-scene-paused'}`}>
                <div className="m-scene-halo" /><div className="m-scene-grain" /><div className="m-scene-stars" />
                <span className="m-scene-caption">{t(theme.tag)}</span><div key={`${theme.id}-${phrase}`} className="m-demo-lyric">{t(phrases[phrase])}</div><span className="m-scene-bottom">WORSHIP LYRICS STUDIO</span>
              </div><div className="m-player-controls"><button aria-label={playing ? t("Pausar demonstração") : t("Reproduzir demonstração")} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}</button><span>{t("Demonstração visual")}</span><div className="m-progress"><i style={{ width: `${(phrase + 1) / phrases.length * 100}%` }} /></div><span>16:9</span><Maximize2 size={12} aria-hidden="true" /></div>
              <div className="m-demo-timeline" aria-label={t("Frases da demonstração")}>{phrases.map((text, index) => <button key={text} className={phrase === index ? "m-timeline-active" : ''} aria-pressed={phrase === index} onClick={() => { setPhrase(index); setPlaying(false); }}><span>0{index + 1}</span>{t(text).replace('\n', ' ')}</button>)}</div>
            </div></div>
          </div>
          <div className="m-theme-picker"><span>{t("Experimente um visual")}</span><div>{themes.map(item => <button key={item.id} className={theme.id === item.id ? "m-theme-selected" : ''} aria-pressed={theme.id === item.id} onClick={() => setTheme(item)}><i className={`m-theme-swatch m-swatch-${item.id}`} />{t(item.name)}</button>)}</div></div>
          <div className="m-annotation"><span>↗</span>{t(" Uma letra. Infinitas possibilidades.")}</div>
        </div>
      </section>
      <div className="m-use-strip"><div className="m-container"><span>{t("DA SUA IGREJA.")}<br /><strong>{t("PARA CADA MOMENTO.")}</strong></span><p>{t("Culto de domingo")}</p><i /><p>{t("Noite de adoração")}</p><i /><p>{t("Natal & Páscoa")}</p><i /><p>{t("Encontro de jovens")}</p></div></div>
      <section className="m-section m-container" id="recursos">
        <div className="m-section-heading" data-reveal><div><span className="m-eyebrow">{t("MENOS OPERAÇÃO. MAIS CRIAÇÃO.")}</span><h2>{t("Uma mensagem forte")}<br />{t("merece um ")}<em>{t("visual à altura.")}</em></h2></div><p>{t("As ferramentas certas para transformar a letra em uma experiência. Tudo em um só lugar.")}</p></div>
        <div className="m-feature-grid">
          <article className="m-feature m-feature-large" data-reveal><span className="m-feature-icon"><Layers3 size={22} /></span><h3>{t("Comece com a letra.")}<br />{t("Encontre o seu estilo.")}</h3><p>{t("Importe a música inteira, escolha um template e receba uma primeira versão. Personalize cada frase, fundo e animação no editor.")}</p><div className="m-style-samples" aria-hidden="true"><div className="m-style-sample-one">{t("Cada palavra")}<br /><em>{t("tem vida.")}</em></div><div className="m-style-sample-two">{t("CADA")}<br />{t("PALAVRA")}<br /><span>{t("IMPORTA.")}</span></div><div className="m-style-sample-three">{t("Um novo")}<br /><em>{t("amanhecer.")}</em></div></div><span className="m-feature-foot">{t("Templates · Fontes · Fundos · Animações ")}<ArrowRight size={17} /></span></article>
          <article className="m-feature m-feature-audio" data-reveal><span className="m-feature-icon"><AudioLines size={22} /></span><h3>{t("No tempo da música.")}</h3><p>{t("Use o áudio de referência para alinhar as letras. Confira no preview e refine os tempos na timeline.")}</p><div className="m-waveform" aria-hidden="true">{Array.from({ length: 44 }, (_, i) => <i key={i} style={{ height: `${18 + ((i * 19 + 7) % 57)}px` }} />)}<span /></div><div className="m-sync-label"><span /><span>{t("Letra e música, em sintonia")}</span></div></article>
          <article className="m-feature m-feature-export" data-reveal><span className="m-feature-icon"><Download size={22} /></span><h3>{t("Da criação à celebração.")}</h3><p>{t("Exporte o MP4 sem áudio na resolução que sua tela precisa. Importe e exporte letras do ProPresenter.")}</p><div className="m-format-cards" aria-hidden="true"><span>{"MP4"}<small>{t("PRONTO PARA EXIBIR")}</small></span><span>{".pro"}<small>{t("LETRAS EDITÁVEIS")}</small></span></div></article>
        </div>
      </section>
      <section className="m-process" id="como-funciona"><div className="m-container m-section"><div className="m-process-title" data-reveal><span className="m-eyebrow">{t("O PRÓXIMO VÍDEO COMEÇA AQUI")}</span><h2>{t("Da inspiração à tela.")}<br /><em>{t("Sem perder o ritmo.")}</em></h2></div><div className="m-steps">{[
        ['01', 'Traga a sua letra', 'Cole o texto completo ou importe uma música. Organize versos, refrões e repetições.'],
        ['02', 'Dê o seu toque', 'Escolha um tema, ajuste cada slide e acompanhe o resultado no preview animado.'],
        ['03', 'Compartilhe a mensagem', 'Sincronize, revise e exporte. O seu visual, pronto para fazer parte da celebração.'],
      ].map(([number, title, text]) => <article key={number} data-reveal><span>{number}</span><h3>{t(title)}</h3><p>{t(text)}</p></article>)}</div></div></section>
      <section className="m-section m-container m-team" id="igrejas"><div className="m-team-art" data-reveal><div className="m-team-orbit" /><div className="m-team-center"><AudioLines size={34} /><span>{t("Um ministério.")}<br /><strong>{t("Várias mãos.")}</strong></span></div><div className="m-person m-person-one"><span>{"RC"}</span><div>{t("Responsável")}<small>{t("Cuida do espaço da igreja")}</small></div><Check size={15} /></div><div className="m-person m-person-two"><span>{"ED"}</span><div>{t("Editor")}<small>{t("Dá vida a cada letra")}</small></div><Type size={15} /></div><div className="m-person m-person-three"><span>{"LR"}</span><div>{t("Leitor")}<small>{t("Acompanha o conteúdo")}</small></div><CirclePlay size={15} /></div></div><div data-reveal><span className="m-eyebrow">{t("FEITO PARA A VIDA EM COMUNIDADE")}</span><h2>{t("A criatividade é sua.")}<br />{t("O espaço é ")}<em>{t("da igreja.")}</em></h2><p>{t("Uma biblioteca organizada. Projetos reunidos. Cada pessoa com o acesso certo para servir junto.")}</p><ul className="m-team-benefits"><li><Check size={17} />{t(" Letras e projetos no espaço da sua igreja")}</li><li><Check size={17} />{t(" Convites e permissões para a equipe")}</li><li><Check size={17} />{t(" Mais continuidade entre os voluntários")}</li></ul><Link className="m-text-link" href="/register">{t("Criar o espaço da minha igreja ")}<ArrowRight size={18} /></Link></div></section>
      <section className="m-faq m-container m-section"><div data-reveal><span className="m-eyebrow">{t("ANTES DE COMEÇAR")}</span><h2>{t("Vamos tirar")}<br />{t("suas ")}<em>{t("dúvidas.")}</em></h2></div><div className="m-questions">{questions.map(([question, answer]) => <details key={question}><summary>{t(question)}<ChevronDown size={18} /></summary><p>{t(answer)}</p></details>)}</div></section>
      <section className="m-final-wrap m-container" data-reveal><div className="m-final"><span className="m-final-glow" /><span className="m-eyebrow">{t("SUA PRÓXIMA CELEBRAÇÃO TEM UMA NOVA POSSIBILIDADE")}</span><h2>{t("O louvor já tem uma voz.")}<br /><em>{t("Agora, dê a ele um visual.")}</em></h2><Link href="/register" className="m-button m-button-light">{t("Começar a criar ")}<ArrowRight size={18} /></Link><p>{t("Feito com propósito. Criado para a sua igreja.")}</p></div></section>
    </main>
    <footer className="m-container m-footer"><Link href="/" aria-label={t("Worship Lyrics Studio, início")}><Brand /></Link><p>{t("Criatividade a serviço da mensagem.")}</p><div><Link href="/login">{t("Entrar na plataforma ")}<ArrowRight size={14} /></Link><span>© {new Date().getFullYear()} Worship Lyrics Studio</span></div></footer>
    <a className="m-bottom-hint" href="#recursos" aria-label={t("Conhecer os recursos")}><ArrowDown size={15} /></a>
  </div>;
}
