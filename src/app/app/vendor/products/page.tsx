"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import DynamicBackground from "@/design-system/backgrounds/DynamicBackground";
import AppShell from "@/frontend/shell/AppShell";

type SellerStore = {
  id: string;
  name: string;
  status: string;
  verified: boolean;
  store: { id: string; name: string; status: string; description?: string | null };
};
type Product = {
  id: string;
  name: string;
  description?: string | null;
  sku: string;
  image?: string | null;
  price: number;
  currency: string;
  stock: number;
  status: string;
  category?: { id: string; name: string } | null;
};
const categories = [
  "Eletrónica", "Moda e acessórios", "Casa e jardim", "Alimentação e mercearia",
  "Beleza e cuidados", "Desporto e lazer", "Livros e media", "Automóveis",
  "Motociclos", "Imóveis e arrendamento", "Serviços", "Lojas de bairro", "Outros",
];

export default function VendorProductsPage() {
  const [vendor, setVendor] = useState<SellerStore | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [storeName, setStoreName] = useState("");
  const [form, setForm] = useState({
    name: "", description: "", image: "", price: "", stock: "1", categoryName: "Outros",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/vendor/products", { credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível carregar o espaço comercial.");
      setVendor(data.vendor ?? null);
      setProducts(Array.isArray(data.products) ? data.products : []);
      if (data.vendor?.store?.name) setStoreName(data.vendor.store.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocorreu um erro ao carregar a loja.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/vendors/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível criar a loja.");
      setNotice("Pedido de abertura enviado. A loja fica em análise de conformidade; já pode preparar o catálogo.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar a loja.");
    } finally { setSaving(false); }
  }

  async function uploadImage(file?: File) {
    if (!file) return;
    setError(""); setNotice("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Usa uma imagem JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem deve ter até 5 MB.");
      return;
    }
    setUploadingImage(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/vendor/products/media", {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await response.json();
      if (!response.ok || !data.imageUrl) throw new Error(data.message || "Não foi possível carregar a imagem.");
      setForm((current) => ({ ...current, image: data.imageUrl }));
      setNotice("Imagem carregada com segurança e pronta para associar ao anúncio.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar a imagem.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/vendor/products", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          stock: Number(form.stock),
          currency: "AOA",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível guardar o anúncio.");
      setNotice(data.message || "Anúncio guardado como rascunho.");
      setForm({ name: "", description: "", image: "", price: "", stock: "1", categoryName: "Outros" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível guardar o anúncio.");
    } finally { setSaving(false); }
  }

  async function productAction(productId: string, action: "publish" | "archive") {
    setError(""); setNotice("");
    try {
      const response = await fetch("/api/vendor/products", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível alterar o anúncio.");
      setNotice(data.message || "Alteração guardada.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível alterar o anúncio."); }
  }

  const field = "w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-4 py-3 text-sm text-[var(--theme-text)] outline-none transition placeholder:text-[var(--theme-text-faint)] focus:border-[var(--theme-text-muted)]";
  const label = "mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--theme-text-muted)]";

  return (
    <DynamicBackground>
      <AppShell>
        <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:py-10">
          <header className="flex flex-col justify-between gap-5 border-b border-[var(--theme-border)] pb-7 md:flex-row md:items-end">
            <div>
              <p className="marka-kicker">MARKA / SELLER STUDIO</p>
              <h1 className="marka-editorial mt-3 text-4xl text-[var(--theme-text)] lg:text-6xl">A sua loja. O seu negócio.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--theme-text-muted)]">
                Abra uma loja, organize o catálogo e prepare os seus anúncios num só espaço. A publicação comercial depende da aprovação da conta e da loja.
              </p>
            </div>
            {vendor && <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-5 py-4">
              <p className="text-[9px] uppercase tracking-[0.2em] text-[var(--theme-text-faint)]">Estado do vendedor</p>
              <p className="mt-2 text-sm font-semibold text-[var(--theme-text)]">{vendor.status === "ACTIVE" ? "Conta ativa" : "Em análise"}</p>
              <p className="mt-1 text-xs text-[var(--theme-text-muted)]">{vendor.verified ? "Identidade comercial verificada" : "Verificação comercial pendente"}</p>
            </div>}
          </header>

          {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600">{error}</div>}
          {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-[var(--theme-text)]">{notice}</div>}

          {loading ? <div className="rounded-2xl border border-[var(--theme-border)] p-8 text-sm text-[var(--theme-text-muted)]">A carregar o seu espaço comercial…</div> : !vendor ? (
            <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.75rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-7 sm:p-10">
                <p className="marka-kicker">COMECE A VENDER</p>
                <h2 className="marka-editorial mt-4 text-3xl text-[var(--theme-text)] sm:text-4xl">Abra a sua loja na MARKA.</h2>
                <p className="mt-4 text-sm leading-7 text-[var(--theme-text-muted)]">Venda produtos, construa uma marca e prepare-se para receber encomendas. A candidatura fica pendente de validação antes de os anúncios poderem ser publicados.</p>
                <form onSubmit={createStore} className="mt-8 space-y-4">
                  <div><label className={label} htmlFor="storeName">Nome da loja ou negócio</label><input id="storeName" className={field} required minLength={2} maxLength={160} value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Ex.: Mercado do Bairro" /></div>
                  <button disabled={saving} className="w-full rounded-full bg-[var(--theme-text)] px-5 py-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--theme-background)] transition hover:opacity-85 disabled:opacity-50">{saving ? "A criar candidatura…" : "Abrir a minha loja"}</button>
                </form>
                <p className="mt-4 text-xs leading-6 text-[var(--theme-text-faint)]">É necessário ter sessão iniciada e pertencer a uma organização ativa. A candidatura não ativa automaticamente pagamentos nem publica anúncios sem verificação.</p>
              </div>
              <aside className="rounded-[1.75rem] border border-[var(--theme-border)] bg-[var(--theme-background)] p-7 sm:p-10">
                <p className="marka-kicker">UM MERCADO, VÁRIOS SETORES</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {["Produtos", "Automóveis", "Motociclos", "Imóveis", "Serviços", "Lojas locais"].map((item) => <div key={item} className="rounded-xl border border-[var(--theme-border)] p-4"><span className="text-sm text-[var(--theme-text)]">{item}</span></div>)}
                </div>
                <p className="mt-6 text-sm leading-7 text-[var(--theme-text-muted)]">A MARKA está a estruturar a experiência por tipo de anúncio. Neste momento, este espaço ativa a abertura de loja e o catálogo de produtos; categorias especializadas exigem os respetivos formulários e validações.</p>
              </aside>
            </section>
          ) : (
            <>
              <section className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Anúncios no catálogo", value: products.length },
                  { label: "Publicados", value: products.filter((p) => p.status === "ACTIVE").length },
                  { label: "Rascunhos", value: products.filter((p) => p.status === "DRAFT").length },
                ].map((stat) => <div key={stat.label} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5"><p className="text-[9px] uppercase tracking-[0.2em] text-[var(--theme-text-faint)]">{stat.label}</p><p className="marka-editorial mt-3 text-3xl text-[var(--theme-text)]">{stat.value}</p></div>)}
              </section>

              <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-8">
                  <p className="marka-kicker">NOVO ANÚNCIO</p>
                  <h2 className="marka-editorial mt-3 text-3xl text-[var(--theme-text)]">Adicionar produto</h2>
                  <form onSubmit={createProduct} className="mt-6 space-y-4">
                    <div><label className={label} htmlFor="productName">Nome do produto</label><input id="productName" className={field} required minLength={2} maxLength={180} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Candeeiro artesanal" /></div>
                    <div><label className={label} htmlFor="productDescription">Descrição</label><textarea id="productDescription" className={field} rows={4} maxLength={5000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes, estado, dimensões, garantia…" /></div>
                    <div>
                      <label className={label} htmlFor="productImageFile">Fotografia do produto</label>
                      <input id="productImageFile" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className={field} disabled={uploadingImage} onChange={(e) => void uploadImage(e.target.files?.[0])} />
                      <p className="mt-2 text-xs text-[var(--theme-text-faint)]">{uploadingImage ? "A carregar e validar a imagem…" : "JPG, PNG ou WebP · máximo 5 MB."}</p>
                      <label className={label} htmlFor="productImage">Ou URL de imagem já alojada</label>
                      <input id="productImage" type="url" className={field} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://…" />
                      {form.image && <img src={form.image} alt="Pré-visualização do produto" className="mt-3 h-36 w-36 rounded-xl border border-[var(--theme-border)] object-cover" />}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><label className={label} htmlFor="productPrice">Preço (Kz)</label><input id="productPrice" className={field} type="number" min="0.01" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="15000" /></div>
                      <div><label className={label} htmlFor="productStock">Stock disponível</label><input id="productStock" className={field} type="number" min="0" step="1" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
                    </div>
                    <div><label className={label} htmlFor="productCategory">Categoria</label><select id="productCategory" className={field} value={form.categoryName} onChange={(e) => setForm({ ...form, categoryName: e.target.value })}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
                    <button disabled={saving || uploadingImage} className="w-full rounded-full bg-[var(--theme-text)] px-5 py-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--theme-background)] transition hover:opacity-85 disabled:opacity-50">{saving ? "A guardar…" : "Guardar anúncio como rascunho"}</button>
                  </form>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-8">
                    <p className="marka-kicker">A SUA LOJA</p>
                    <h2 className="marka-editorial mt-3 text-3xl text-[var(--theme-text)]">{vendor.store.name}</h2>
                    <p className="mt-3 text-sm text-[var(--theme-text-muted)]">Estado da loja: {vendor.store.status} · Estado da conta: {vendor.status}</p>
                    <p className="mt-3 text-sm leading-6 text-[var(--theme-text-muted)]">Pode preparar anúncios enquanto a candidatura é analisada. A publicação e a receção de encomendas dependem da aprovação comercial.</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-8">
                    <div className="flex items-center justify-between gap-4"><div><p className="marka-kicker">CATÁLOGO</p><h2 className="marka-editorial mt-2 text-2xl text-[var(--theme-text)]">Os seus anúncios</h2></div><button onClick={() => void load()} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs text-[var(--theme-text-muted)]">Atualizar</button></div>
                    {products.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-[var(--theme-border)] p-8 text-center"><p className="text-sm text-[var(--theme-text)]">Ainda não tem anúncios.</p><p className="mt-2 text-xs leading-6 text-[var(--theme-text-muted)]">Use o formulário para criar o primeiro produto. Ele ficará guardado como rascunho até poder ser publicado.</p></div> : <div className="mt-6 space-y-3">
                      {products.map((product) => <article key={product.id} className="flex gap-4 rounded-xl border border-[var(--theme-border)] p-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--theme-background)]">{product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[9px] tracking-[0.2em] text-[var(--theme-text-faint)]">MARKA</div>}</div>
                        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-medium text-[var(--theme-text)]">{product.name}</h3><span className="rounded-full border border-[var(--theme-border)] px-2 py-1 text-[9px] uppercase tracking-[0.15em] text-[var(--theme-text-muted)]">{product.status}</span></div><p className="mt-1 text-sm text-[var(--theme-text-muted)]">{new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 }).format(product.price)} · Stock {product.stock}</p><p className="mt-1 text-xs text-[var(--theme-text-faint)]">{product.category?.name ?? "Sem categoria"} · SKU {product.sku}</p><div className="mt-3 flex flex-wrap gap-2">{product.status === "DRAFT" && <button onClick={() => void productAction(product.id, "publish")} className="rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-[10px] text-[var(--theme-text)]">Publicar</button>}{product.status !== "ARCHIVED" && <button onClick={() => void productAction(product.id, "archive")} className="rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-[10px] text-[var(--theme-text-muted)]">Arquivar</button>}</div></div>
                      </article>)}
                    </div>}
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </AppShell>
    </DynamicBackground>
  );
}
