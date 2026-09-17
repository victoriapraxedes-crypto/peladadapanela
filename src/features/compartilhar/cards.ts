/**
 * Cards compartilháveis desenhados em canvas (1080x1350, formato de post).
 * Sem dependência externa: fonte do app, logo oficial e cores da identidade.
 */

const COR = {
  fundo: "#07142E",
  fundo2: "#0D1F45",
  linha: "#1E3A73",
  amarelo: "#FFD21F",
  azul: "#2F7BFF",
  branco: "#FFFFFF",
  suave: "#A9BADF",
  vermelho: "#F05252",
};

const L = 1080;
const A = 1350;

async function prepararFontes() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('700 64px "Space Grotesk"'),
      document.fonts.load('500 32px "Inter"'),
    ]);
  } catch {
    // segue com a fonte de sistema
  }
}

function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function novoCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = L;
  canvas.height = A;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível neste navegador.");
  return { canvas, ctx };
}

function fonte(peso: number, tamanho: number, display = true) {
  return `${peso} ${tamanho}px ${display ? '"Space Grotesk", "Inter"' : '"Inter"'}, sans-serif`;
}

function cortar(ctx: CanvasRenderingContext2D, texto: string, largura: number) {
  if (ctx.measureText(texto).width <= largura) return texto;
  let t = texto;
  while (t.length > 1 && ctx.measureText(t + "…").width > largura) t = t.slice(0, -1);
  return t + "…";
}

function retangulo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function fundoECabecalho(ctx: CanvasRenderingContext2D, sobretitulo: string) {
  ctx.fillStyle = COR.fundo;
  ctx.fillRect(0, 0, L, A);

  const brilho = ctx.createRadialGradient(L / 2, -200, 50, L / 2, -200, 1100);
  brilho.addColorStop(0, "rgba(47,123,255,0.35)");
  brilho.addColorStop(1, "rgba(47,123,255,0)");
  ctx.fillStyle = brilho;
  ctx.fillRect(0, 0, L, A);

  // faixa amarela de campo
  ctx.fillStyle = COR.amarelo;
  ctx.fillRect(0, 0, L, 14);

  const logo = await carregarImagem("/logo-pelada.svg");
  if (logo) ctx.drawImage(logo, 72, 72, 112, 112);

  ctx.fillStyle = COR.branco;
  ctx.font = fonte(700, 44);
  ctx.textBaseline = "alphabetic";
  ctx.fillText("PELADA DA", 208, 122);
  ctx.fillStyle = COR.amarelo;
  ctx.fillText("PANELA", 208, 172);

  ctx.fillStyle = COR.suave;
  ctx.font = fonte(600, 28, false);
  ctx.textAlign = "right";
  ctx.fillText(sobretitulo.toUpperCase(), L - 72, 122);
  ctx.textAlign = "left";
}

function rodape(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = COR.suave;
  ctx.font = fonte(500, 26, false);
  ctx.textAlign = "center";
  ctx.fillText("4 por gol  ·  2 por assistência  ·  −5 por carrinho", L / 2, A - 60);
  ctx.textAlign = "left";
}

function paraBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar a imagem."))),
      "image/png",
    );
  });
}

export interface DestaqueCard {
  titulo: string;
  nomes: string;
  valor: string;
}

export interface LinhaCard {
  apelido: string;
  pontos: number;
  gols: number;
  assistencias: number;
  carrinhos: number;
}

export async function gerarCardPelada(p: {
  dataExtenso: string;
  local: string;
  destaques: DestaqueCard[];
  top: LinhaCard[];
}): Promise<Blob> {
  await prepararFontes();
  const { canvas, ctx } = novoCanvas();
  await fundoECabecalho(ctx, "Resultado");

  ctx.fillStyle = COR.branco;
  ctx.font = fonte(700, 64);
  ctx.fillText(cortar(ctx, p.dataExtenso, L - 144), 72, 300);
  ctx.fillStyle = COR.suave;
  ctx.font = fonte(500, 32, false);
  ctx.fillText(cortar(ctx, p.local, L - 144), 72, 350);

  let y = 410;
  for (const d of p.destaques.slice(0, 3)) {
    retangulo(ctx, 72, y, L - 144, 120, 24);
    ctx.fillStyle = COR.fundo2;
    ctx.fill();
    ctx.strokeStyle = COR.linha;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = COR.amarelo;
    ctx.font = fonte(700, 24, false);
    ctx.fillText(d.titulo.toUpperCase(), 104, y + 46);
    ctx.fillStyle = COR.branco;
    ctx.font = fonte(700, 40);
    ctx.fillText(cortar(ctx, d.nomes, L - 440), 104, y + 94);
    ctx.fillStyle = COR.amarelo;
    ctx.font = fonte(700, 52);
    ctx.textAlign = "right";
    ctx.fillText(d.valor, L - 104, y + 84);
    ctx.textAlign = "left";
    y += 140;
  }

  y += 20;
  ctx.fillStyle = COR.suave;
  ctx.font = fonte(600, 24, false);
  ctx.fillText("TOP DA PELADA", 72, y);
  const colunas = [L - 312, L - 262, L - 212];
  ctx.textAlign = "right";
  ["G", "A", "C"].forEach((t, i) => ctx.fillText(t, colunas[i]!, y));
  ctx.fillText("PTS", L - 72, y);
  ctx.textAlign = "left";
  y += 20;

  p.top.slice(0, 6).forEach((l, i) => {
    const linhaY = y + 20 + i * 62;
    ctx.fillStyle = COR.linha;
    ctx.fillRect(72, linhaY + 44, L - 144, 2);
    ctx.fillStyle = i === 0 ? COR.amarelo : COR.suave;
    ctx.font = fonte(700, 32);
    ctx.fillText(String(i + 1), 72, linhaY + 30);
    ctx.fillStyle = COR.branco;
    ctx.font = fonte(600, 32, false);
    ctx.fillText(cortar(ctx, l.apelido, 580), 128, linhaY + 30);
    ctx.textAlign = "right";
    ctx.fillStyle = COR.suave;
    ctx.font = fonte(600, 28, false);
    [l.gols, l.assistencias, l.carrinhos].forEach((v, k) => {
      ctx.fillStyle = k === 2 && v > 0 ? COR.vermelho : COR.suave;
      ctx.fillText(String(v), colunas[k]!, linhaY + 30);
    });
    ctx.fillStyle = l.pontos < 0 ? COR.vermelho : COR.branco;
    ctx.font = fonte(700, 36);
    ctx.fillText(String(l.pontos), L - 72, linhaY + 30);
    ctx.textAlign = "left";
  });

  rodape(ctx);
  return paraBlob(canvas);
}

export async function gerarCardJogador(p: {
  apelido: string;
  periodo: string;
  posicao: number | null;
  pontos: number;
  jogos: number;
  gols: number;
  assistencias: number;
  carrinhos: number;
  evolucao: number[];
  fotoUrl?: string | null;
}): Promise<Blob> {
  await prepararFontes();
  const { canvas, ctx } = novoCanvas();
  await fundoECabecalho(ctx, p.periodo);

  // foto
  const cx = L / 2;
  const cy = 360;
  const raio = 110;
  const foto = p.fotoUrl ? await carregarImagem(p.fotoUrl) : null;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, raio, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = COR.fundo2;
  ctx.fill();
  if (foto) {
    ctx.clip();
    ctx.drawImage(foto, cx - raio, cy - raio, raio * 2, raio * 2);
  } else {
    ctx.fillStyle = COR.amarelo;
    ctx.font = fonte(700, 96);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(p.apelido.slice(0, 2).toUpperCase(), cx, cy + 4);
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();
  ctx.strokeStyle = COR.amarelo;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, raio + 6, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = COR.branco;
  ctx.font = fonte(700, 72);
  ctx.fillText(cortar(ctx, p.apelido, L - 144), cx, 570);
  if (p.posicao !== null) {
    ctx.fillStyle = COR.amarelo;
    ctx.font = fonte(700, 40);
    ctx.fillText(`${p.posicao}º no ranking`, cx, 630);
  }

  // pontos em destaque
  ctx.fillStyle = p.pontos < 0 ? COR.vermelho : COR.amarelo;
  ctx.font = fonte(700, 180);
  ctx.fillText(String(p.pontos), cx, 820);
  ctx.fillStyle = COR.suave;
  ctx.font = fonte(600, 28, false);
  ctx.fillText("PONTOS", cx, 865);
  ctx.textAlign = "left";

  const tiles = [
    ["JOGOS", p.jogos],
    ["GOLS", p.gols],
    ["ASSIST.", p.assistencias],
    ["CARRINHOS", p.carrinhos],
  ] as const;
  const w = (L - 144 - 3 * 20) / 4;
  tiles.forEach(([rot, val], i) => {
    const x = 72 + i * (w + 20);
    retangulo(ctx, x, 920, w, 150, 22);
    ctx.fillStyle = COR.fundo2;
    ctx.fill();
    ctx.strokeStyle = COR.linha;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = rot === "CARRINHOS" && val > 0 ? COR.vermelho : COR.branco;
    ctx.font = fonte(700, 60);
    ctx.fillText(String(val), x + w / 2, 1010);
    ctx.fillStyle = COR.suave;
    ctx.font = fonte(600, 22, false);
    ctx.fillText(rot, x + w / 2, 1048);
    ctx.textAlign = "left";
  });

  // mini evolução
  const ev = p.evolucao.slice(-12);
  if (ev.length > 0) {
    const top = 1110;
    const alt = 120;
    const max = Math.max(4, ...ev);
    const min = Math.min(0, ...ev);
    const faixa = max - min || 1;
    const zeroY = top + (max / faixa) * alt;
    const bw = (L - 144 - (ev.length - 1) * 10) / ev.length;
    ev.forEach((v, i) => {
      const h = (Math.abs(v) / faixa) * alt;
      ctx.fillStyle = v < 0 ? COR.vermelho : COR.amarelo;
      const x = 72 + i * (bw + 10);
      ctx.fillRect(x, v < 0 ? zeroY : zeroY - Math.max(h, 3), bw, Math.max(h, 3));
    });
    ctx.fillStyle = COR.linha;
    ctx.fillRect(72, zeroY, L - 144, 2);
  }

  rodape(ctx);
  return paraBlob(canvas);
}

/** Compartilhamento nativo quando existe; senão, baixa a imagem. */
export async function compartilharOuBaixar(
  blob: Blob,
  nomeArquivo: string,
  titulo: string,
  texto: string,
): Promise<"compartilhado" | "baixado" | "cancelado"> {
  const arquivo = new File([blob], nomeArquivo, { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (nav.share && nav.canShare?.({ files: [arquivo] })) {
    try {
      await nav.share({ files: [arquivo], title: titulo, text: texto });
      return "compartilhado";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelado";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "baixado";
}
