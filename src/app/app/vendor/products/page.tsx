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
  attributes?: Record<string, string> | null;
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
  "Motociclos", "Imóveis e arrendamento",
  "Indústria e produção", "Agricultura e agropecuária", "Materiais de construção e ferragens",
  "Iluminação e material elétrico", "Portas, janelas e carpintaria", "Calçado", "Mobiliário e decoração",
  "Equipamentos e máquinas", "Embalagens e consumíveis", "Água e bebidas", "Produtos por atacado",
  "Serviços — Eventos e festas", "Serviços — Música e entretenimento", "Serviços — Catering e cozinha",
  "Serviços — Decoração, som e iluminação", "Serviços — Fotografia e vídeo", "Serviços — Casa e manutenção",
  "Serviços — Beleza e bem-estar", "Serviços — Limpeza e apoio", "Serviços — Educação e formação",
  "Serviços — Tecnologia e profissionais", "Serviços — Outros",
  "Lojas de bairro", "Outros",
];

const productTypesByCategory: Record<string, string[]> = {
  "Eletrónica": ["Telemóveis", "Computadores", "Tablets", "Televisores", "Áudio", "Acessórios informáticos", "Impressoras", "Câmaras", "Componentes eletrónicos", "Outros"],
  "Moda e acessórios": ["Vestuário masculino", "Vestuário feminino", "Vestuário infantil", "Malas e carteiras", "Relógios", "Joalharia e bijuteria", "Óculos", "Acessórios de moda", "Outros"],
  "Casa e jardim": ["Utensílios domésticos", "Eletrodomésticos", "Cozinha", "Casa de banho", "Jardim", "Ferramentas domésticas", "Decoração", "Iluminação doméstica", "Outros"],
  "Alimentação e mercearia": ["Arroz", "Óleo", "Massa", "Farinha", "Açúcar", "Feijão", "Cereais", "Conservas", "Carne", "Peixe", "Frutas", "Hortícolas", "Laticínios", "Congelados", "Outros"],
  "Beleza e cuidados": ["Cosméticos", "Cuidados de pele", "Cuidados capilares", "Perfumes", "Higiene pessoal", "Maquilhagem", "Outros"],
  "Desporto e lazer": ["Equipamento desportivo", "Roupa desportiva", "Bicicletas", "Acessórios de treino", "Brinquedos", "Jogos", "Campismo e lazer", "Outros"],
  "Livros e media": ["Livros", "Material escolar", "Papelaria", "Instrumentos musicais", "Filmes e música", "Outros"],
  "Automóveis": ["Viaturas ligeiras", "Viaturas comerciais", "Peças automóveis", "Pneus", "Baterias", "Lubrificantes", "Acessórios", "Outros"],
  "Motociclos": ["Motociclos", "Motas", "Peças", "Capacetes", "Equipamento de proteção", "Acessórios", "Outros"],
  "Materiais de construção e ferragens": [
    "Cimento", "Areia", "Brita", "Blocos", "Tijolos", "Varão de aço", "Ferro e perfis metálicos",
    "Chapas de zinco", "Telhas", "Madeira", "Pregos e parafusos", "Ferramentas", "Tintas e vernizes",
    "Colas e impermeabilizantes", "Tubos e canalização", "Louças sanitárias", "Torneiras e acessórios",
    "Pavimentos e revestimentos", "Cerâmica", "Gesso e pladur", "Vidros", "Outros materiais de construção",
  ],
  "Iluminação e material elétrico": [
    "Candeeiros", "Lâmpadas LED", "Projetores", "Painéis LED", "Iluminação pública", "Iluminação industrial",
    "Fitas LED", "Lustres", "Apliques", "Material elétrico", "Cabos e fios", "Tomadas e interruptores",
    "Disjuntores e quadros", "Geradores", "Transformadores", "Acessórios elétricos", "Outros",
  ],
  "Portas, janelas e carpintaria": [
    "Portas de madeira", "Portas metálicas", "Portas de alumínio", "Portas de vidro", "Janelas de alumínio",
    "Janelas de PVC", "Janelas de madeira", "Grades e portões", "Fechaduras e dobradiças", "Molduras",
    "Carpintaria por medida", "Outros",
  ],
  "Calçado": ["Sapatos", "Sapatilhas", "Sandálias", "Botas", "Chinelos", "Calçado de segurança", "Calçado infantil", "Outros"],
  "Mobiliário e decoração": ["Mesas", "Cadeiras", "Sofás", "Camas", "Colchões", "Armários", "Estantes", "Cozinhas", "Mobiliário de escritório", "Cortinas e tapetes", "Decoração", "Outros"],
  "Água e bebidas": ["Água engarrafada", "Água em garrafões", "Água em bidões", "Água a granel", "Fornecimento por tanque/cisterna", "Refrigerantes", "Sumos", "Bebidas energéticas", "Outras bebidas"],
  "Agricultura e agropecuária": ["Milho", "Feijão", "Arroz", "Mandioca", "Batata", "Tomate", "Cebola", "Frutas", "Hortícolas", "Café", "Cacau", "Ração animal", "Aves", "Gado bovino", "Gado caprino", "Suínos", "Ovos", "Outros produtos agrícolas"],
  "Embalagens e consumíveis": ["Caixas de cartão", "Sacos", "Garrafas", "Frascos", "Embalagens alimentares", "Filme plástico", "Paletes", "Etiquetas", "Papel", "Consumíveis industriais", "Outros"],
  "Equipamentos e máquinas": ["Máquinas industriais", "Equipamentos agrícolas", "Bombas de água", "Motores", "Compressores", "Geradores", "Ferramentas elétricas", "Equipamentos de oficina", "Peças e acessórios", "Outros"],
  "Indústria e produção": ["Produtos fabricados", "Matéria-prima", "Peças industriais", "Produtos metalúrgicos", "Produtos químicos autorizados", "Cerâmica", "Plásticos", "Produtos transformados", "Outros"],
  "Produtos por atacado": ["Alimentação", "Bebidas", "Higiene e limpeza", "Material escolar", "Material elétrico", "Construção", "Vestuário", "Calçado", "Embalagens", "Outros"],
};
const serviceTypesByCategory: Record<string, string[]> = {
  "Serviços — Eventos e festas": ["Organização de eventos", "DJ", "Mestre de cerimónias", "Músico ou banda", "Animação", "Aluguer de espaço", "Outros"],
  "Serviços — Música e entretenimento": ["DJ", "Músico", "Banda", "Cantor", "Animador", "Apresentador", "Outros"],
  "Serviços — Catering e cozinha": ["Catering", "Cozinheiro para festas", "Cozinheira para festas", "Buffet", "Churrasco", "Bolos e pastelaria", "Salgados", "Preparação de refeições", "Outros"],
  "Serviços — Decoração, som e iluminação": ["Decoração", "Aluguer de som", "Iluminação", "Palco e estruturas", "Tendas e mobiliário", "Flores", "Montagem", "Outros"],
  "Serviços — Fotografia e vídeo": ["Fotografia", "Videografia", "Transmissão em direto", "Edição de vídeo", "Cobertura de eventos", "Outros"],
  "Serviços — Casa e manutenção": ["Canalizador", "Eletricista", "Carpinteiro", "Serralheiro", "Pintor", "Mecânico", "Ar condicionado", "Instalação solar", "Reparações", "Outros"],
  "Serviços — Beleza e bem-estar": ["Cabeleireiro", "Barbeiro", "Maquilhagem", "Manicure", "Estética", "Massagem", "Outros"],
  "Serviços — Limpeza e apoio": ["Limpeza doméstica", "Limpeza pós-obra", "Lavandaria", "Jardinagem", "Apoio a eventos", "Outros"],
  "Serviços — Educação e formação": ["Explicações", "Formação profissional", "Aulas de música", "Idiomas", "Outros"],
  "Serviços — Tecnologia e profissionais": ["Assistência informática", "Redes", "Desenvolvimento de software", "Design", "Consultoria", "Contabilidade", "Tradução", "Outros"],
  "Serviços — Outros": ["Serviço profissional", "Serviço empresarial", "Outro"],
};
const productUnits = ["Unidade", "Conjunto", "Caixa", "Saco", "Pacote", "Quilograma (kg)", "Tonelada (t)", "Litro (L)", "Metro cúbico (m³)", "Metro (m)", "Metro quadrado (m²)", "Rolo", "Palete", "Bidão de 20 L", "Garrafão de 20 L", "Tanque de 1.000 L", "Cisterna", "Outro"];

export default function VendorProductsPage() {
  const [vendor, setVendor] = useState<SellerStore | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [storeName, setStoreName] = useState("");
  const [sellerProfile, setSellerProfile] = useState({ businessType: "INDIVIDUAL" as "INDIVIDUAL" | "COMPANY", phone: "", country: "Angola" });
  const [storeProfile, setStoreProfile] = useState({ name: "", description: "", logo: "", banner: "", location: "" });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", price: "", stock: "", image: "", attributesJson: "{}" });
  const [form, setForm] = useState({
    name: "", description: "", image: "", price: "", stock: "1", categoryName: "Outros",
    brand: "", model: "", year: "", mileage: "", condition: "Usado", fuel: "", transmission: "",
    propertyType: "Apartamento", transactionType: "Arrendamento", bedrooms: "", bathrooms: "", area: "", location: "",
    serviceType: "", availability: "", duration: "", productType: "", unit: "Unidade", capacity: "",
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
      if (data.vendor?.store) setStoreProfile({ name: data.vendor.store.name ?? "", description: data.vendor.store.description ?? "", logo: data.vendor.store.logo ?? "", banner: data.vendor.store.banner ?? "", location: data.vendor.store.location ?? "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocorreu um erro ao carregar a loja.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function createStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/vendors/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName, ...sellerProfile }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível criar a loja.");
      setNotice("Pedido de abertura enviado. A loja fica em análise de conformidade; já pode preparar o catálogo.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar a loja.");
    } finally { setSaving(false); }
  }

  async function saveStoreProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/vendor/store", {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storeProfile),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível atualizar o perfil da loja.");
      setNotice(data.message || "Perfil da loja atualizado.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível atualizar o perfil da loja.");
    } finally { setSaving(false); }
  }

  async function uploadImage(file?: File, target: "product" | "logo" | "banner" = "product") {
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
      if (target === "product") {
        setProductImages((current) => current.includes(data.imageUrl) ? current : [...current, data.imageUrl].slice(0, 10));
        setForm((current) => ({ ...current, image: current.image || data.imageUrl }));
      }
      else setStoreProfile((current) => ({ ...current, [target]: data.imageUrl }));
      setNotice(target === "product" ? "Imagem carregada com segurança e pronta para associar ao anúncio." : "Imagem da identidade comercial carregada com segurança.");
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
          brand: form.brand, model: form.model, year: form.year, mileage: form.mileage, condition: form.condition, fuel: form.fuel, transmission: form.transmission,
          propertyType: form.propertyType, transactionType: form.transactionType, bedrooms: form.bedrooms, bathrooms: form.bathrooms, area: form.area, location: form.location,
          serviceType: form.serviceType, availability: form.availability, duration: form.duration,
          productType: form.productType, unit: form.unit, capacity: form.capacity, images: productImages,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível guardar o anúncio.");
      setNotice(data.message || "Anúncio guardado como rascunho.");
      setForm({ name: "", description: "", image: "", price: "", stock: "1", categoryName: "Outros", brand: "", model: "", year: "", mileage: "", condition: "Usado", fuel: "", transmission: "", propertyType: "Apartamento", transactionType: "Arrendamento", bedrooms: "", bathrooms: "", area: "", location: "", serviceType: "", availability: "", duration: "", productType: "", unit: "Unidade", capacity: "" });
      setProductImages([]);
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

  function beginEdit(product: Product) {
    setEditingProductId(product.id);
    setEditForm({ name: product.name, description: product.description ?? "", price: String(product.price), stock: String(product.stock), image: product.image ?? "", attributesJson: JSON.stringify(product.attributes ?? {}, null, 2) });
    setError("");
    setNotice("");
  }

  async function saveProductEdit(productId: string) {
    setSaving(true); setError(""); setNotice("");
    try {
      let attributes: Record<string, string>;
      try {
        const parsedAttributes: unknown = JSON.parse(editForm.attributesJson);
        if (!parsedAttributes || typeof parsedAttributes !== "object" || Array.isArray(parsedAttributes) || Object.values(parsedAttributes).some((value) => typeof value !== "string")) {
          throw new Error("As especificações devem ser um objeto JSON com valores em texto.");
        }
        attributes = parsedAttributes as Record<string, string>;
      } catch (parseError) {
        throw new Error(parseError instanceof Error ? parseError.message : "As especificações não têm um formato válido.");
      }
      const response = await fetch("/api/vendor/products", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, action: "update", name: editForm.name, description: editForm.description, price: Number(editForm.price), stock: Number(editForm.stock), image: editForm.image, attributes }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível atualizar o anúncio.");
      setEditingProductId(null); setNotice(data.message || "Anúncio atualizado."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível atualizar o anúncio."); }
    finally { setSaving(false); }
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

          {vendor && <section className="rounded-[1.5rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-8">
            <div className="mb-6">
              <p className="marka-kicker">IDENTIDADE COMERCIAL</p>
              <h2 className="marka-editorial mt-3 text-3xl text-[var(--theme-text)]">Perfil da loja</h2>
              <p className="mt-2 text-sm text-[var(--theme-text-muted)]">Defina a apresentação pública do negócio. Use imagens alojadas em HTTPS; a identidade não altera o estado de aprovação.</p>
            </div>
            <form onSubmit={saveStoreProfile} className="grid gap-4 md:grid-cols-2">
              <div><label className={label} htmlFor="storeProfileName">Nome comercial</label><input id="storeProfileName" className={field} required minLength={2} maxLength={160} value={storeProfile.name} onChange={(e) => setStoreProfile({ ...storeProfile, name: e.target.value })} /></div>
              <div><label className={label} htmlFor="storeProfileLocation">Localização</label><input id="storeProfileLocation" className={field} maxLength={200} value={storeProfile.location} onChange={(e) => setStoreProfile({ ...storeProfile, location: e.target.value })} placeholder="Município, província" /></div>
              <div className="md:col-span-2"><label className={label} htmlFor="storeProfileDescription">Descrição da loja</label><textarea id="storeProfileDescription" className={field} rows={3} maxLength={2000} value={storeProfile.description} onChange={(e) => setStoreProfile({ ...storeProfile, description: e.target.value })} placeholder="Apresente o negócio, os produtos e os serviços…" /></div>
              <div><label className={label} htmlFor="storeLogoFile">Logótipo da loja</label><input id="storeLogoFile" type="file" accept="image/jpeg,image/png,image/webp" className={field} disabled={uploadingImage} onChange={(e) => void uploadImage(e.target.files?.[0], "logo")} /><label className={label} htmlFor="storeProfileLogo">Ou URL do logótipo</label><input id="storeProfileLogo" type="url" className={field} value={storeProfile.logo} onChange={(e) => setStoreProfile({ ...storeProfile, logo: e.target.value })} placeholder="https://…" />{storeProfile.logo && <img src={storeProfile.logo} alt="Pré-visualização do logótipo" className="mt-2 h-20 w-20 rounded-xl border border-[var(--theme-border)] object-cover" />}</div>
              <div><label className={label} htmlFor="storeBannerFile">Banner da loja</label><input id="storeBannerFile" type="file" accept="image/jpeg,image/png,image/webp" className={field} disabled={uploadingImage} onChange={(e) => void uploadImage(e.target.files?.[0], "banner")} /><label className={label} htmlFor="storeProfileBanner">Ou URL do banner</label><input id="storeProfileBanner" type="url" className={field} value={storeProfile.banner} onChange={(e) => setStoreProfile({ ...storeProfile, banner: e.target.value })} placeholder="https://…" />{storeProfile.banner && <img src={storeProfile.banner} alt="Pré-visualização do banner" className="mt-2 h-24 w-full rounded-xl border border-[var(--theme-border)] object-cover" />}</div>
              <div className="md:col-span-2 flex justify-end"><button disabled={saving} className="rounded-full bg-[var(--theme-text)] px-7 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--theme-background)] disabled:opacity-50">{saving ? "A guardar…" : "Guardar perfil da loja"}</button></div>
            </form>
          </section>}

          {loading ? <div className="rounded-2xl border border-[var(--theme-border)] p-8 text-sm text-[var(--theme-text-muted)]">A carregar o seu espaço comercial…</div> : !vendor ? (
            <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.75rem] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-7 sm:p-10">
                <p className="marka-kicker">COMECE A VENDER</p>
                <h2 className="marka-editorial mt-4 text-3xl text-[var(--theme-text)] sm:text-4xl">Abra a sua loja na MARKA.</h2>
                <p className="mt-4 text-sm leading-7 text-[var(--theme-text-muted)]">Venda produtos, construa uma marca e prepare-se para receber encomendas. A candidatura fica pendente de validação antes de os anúncios poderem ser publicados.</p>
                <form onSubmit={createStore} className="mt-8 space-y-4">
                  <div><label className={label} htmlFor="sellerType">Tipo de vendedor</label><select id="sellerType" className={field} value={sellerProfile.businessType} onChange={(e) => setSellerProfile({ ...sellerProfile, businessType: e.target.value as "INDIVIDUAL" | "COMPANY" })}><option value="INDIVIDUAL">Pessoa singular / vendedor individual</option><option value="COMPANY">Empresa / pessoa coletiva</option></select></div>
                  <div><label className={label} htmlFor="storeName">Nome da loja ou negócio</label><input id="storeName" className={field} required minLength={2} maxLength={160} value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Ex.: Mercado do Bairro" /></div>
                  <div className="grid gap-4 sm:grid-cols-2"><div><label className={label} htmlFor="sellerPhone">Telefone de contacto</label><input id="sellerPhone" className={field} type="tel" autoComplete="tel" maxLength={40} value={sellerProfile.phone} onChange={(e) => setSellerProfile({ ...sellerProfile, phone: e.target.value })} placeholder="+244 9XX XXX XXX" /></div><div><label className={label} htmlFor="sellerCountry">País de operação</label><input id="sellerCountry" className={field} required maxLength={80} value={sellerProfile.country} onChange={(e) => setSellerProfile({ ...sellerProfile, country: e.target.value })} placeholder="Angola" /></div></div>
                  <button disabled={saving} className="w-full rounded-full bg-[var(--theme-text)] px-5 py-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--theme-background)] transition hover:opacity-85 disabled:opacity-50">{saving ? "A criar candidatura…" : "Abrir a minha loja"}</button>
                </form>
                <p className="mt-4 text-xs leading-6 text-[var(--theme-text-faint)]">É necessário ter sessão iniciada e uma adesão ativa à MARKA. Pessoas singulares e empresas podem candidatar-se; a equipa valida os dados antes de ativar a loja e permitir publicações.</p>
              </div>
              <aside className="rounded-[1.75rem] border border-[var(--theme-border)] bg-[var(--theme-background)] p-7 sm:p-10">
                <p className="marka-kicker">UM MERCADO, VÁRIOS SETORES</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {["Produtos", "Indústria", "Agricultura", "Imóveis e armazéns", "Eventos e catering", "Serviços profissionais"].map((item) => <div key={item} className="rounded-xl border border-[var(--theme-border)] p-4"><span className="text-sm text-[var(--theme-text)]">{item}</span></div>)}
                </div>
                <p className="mt-6 text-sm leading-7 text-[var(--theme-text-muted)]">A MARKA permite preparar anúncios de produtos, veículos, imóveis e serviços no mesmo espaço. Cada categoria apresenta campos próprios; todos os anúncios começam como rascunho e a publicação depende da aprovação comercial.</p>
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
                      <label className={label} htmlFor="productImageFile">Fotografias do produto (até 10)</label>
                      <input id="productImageFile" type="file" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className={field} disabled={uploadingImage || productImages.length >= 10} onChange={async (e) => { const input = e.currentTarget; const files = Array.from(input.files ?? []).slice(0, 10 - productImages.length); for (const file of files) await uploadImage(file); input.value = ""; }} />
                      <p className="mt-2 text-xs text-[var(--theme-text-faint)]">{uploadingImage ? "A carregar e validar as fotografias…" : "JPG, PNG ou WebP · até 5 MB por fotografia. Pode adicionar várias perspetivas do mesmo produto."}</p>
                      <label className={label} htmlFor="productImage">URL da fotografia principal (opcional)</label>
                      <input id="productImage" type="url" className={field} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://…" />
                      {(productImages.length > 0 || form.image) && <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">{(productImages.length ? productImages : [form.image]).filter(Boolean).map((url, index) => <div key={url} className="relative"><img src={url} alt={`Fotografia ${index + 1} do produto`} className="h-24 w-full rounded-xl border border-[var(--theme-border)] object-cover" /><button type="button" onClick={() => { setProductImages((current) => current.filter((item) => item !== url)); if (form.image === url) setForm((current) => ({ ...current, image: productImages.find((item) => item !== url) ?? "" })); }} className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-1 text-xs text-white" aria-label="Remover fotografia">×</button></div>)}</div>}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><label className={label} htmlFor="productPrice">Preço (Kz)</label><input id="productPrice" className={field} type="number" min="0.01" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="15000" /></div>
                      <div><label className={label} htmlFor="productStock">Quantidade disponível</label><input id="productStock" className={field} type="number" min="0" step="1" required value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
                    </div>
                    <div><label className={label} htmlFor="productCategory">Categoria principal</label><select id="productCategory" className={field} value={form.categoryName} onChange={(e) => setForm({ ...form, categoryName: e.target.value, productType: "", serviceType: "" })}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
                    {form.categoryName.startsWith("Serviços") ? <div><label className={label} htmlFor="serviceType">Tipo de serviço prestado</label><select id="serviceType" className={field} required value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}><option value="">Escolher especialidade</option>{(serviceTypesByCategory[form.categoryName] ?? ["Outro serviço"]).map((type) => <option key={type} value={type}>{type}</option>)}</select></div> : form.categoryName !== "Imóveis e arrendamento" && <div><label className={label} htmlFor="productType">Tipo de produto / mercadoria</label><select id="productType" className={field} required value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value })}><option value="">Escolher tipo de produto</option>{(productTypesByCategory[form.categoryName] ?? ["Outros produtos"]).map((type) => <option key={type} value={type}>{type}</option>)}</select></div>}
                    {!form.categoryName.startsWith("Serviços") && form.categoryName !== "Imóveis e arrendamento" && <div className="grid gap-4 sm:grid-cols-2"><div><label className={label} htmlFor="productUnit">Unidade de venda</label><select id="productUnit" className={field} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>{productUnits.map((unit) => <option key={unit}>{unit}</option>)}</select></div><div><label className={label} htmlFor="productCapacity">Capacidade / medida (opcional)</label><input id="productCapacity" className={field} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="Ex.: 1.000 litros, 50 kg, 6 metros" /></div></div>}
                    {(form.categoryName === "Automóveis" || form.categoryName === "Motociclos") && <fieldset className="space-y-4 rounded-xl border border-[var(--theme-border)] p-4"><legend className={label}>Detalhes do veículo</legend>
                      <div className="grid gap-4 sm:grid-cols-2"><div><label className={label} htmlFor="vehicleBrand">Marca</label><input id="vehicleBrand" className={field} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Toyota" /></div><div><label className={label} htmlFor="vehicleModel">Modelo</label><input id="vehicleModel" className={field} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Corolla" /></div>
                      <div><label className={label} htmlFor="vehicleYear">Ano</label><input id="vehicleYear" className={field} type="number" min="1950" max="2035" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2020" /></div><div><label className={label} htmlFor="vehicleMileage">Quilometragem (km)</label><input id="vehicleMileage" className={field} type="number" min="0" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} placeholder="85000" /></div>
                      <div><label className={label} htmlFor="vehicleCondition">Estado</label><select id="vehicleCondition" className={field} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}><option>Novo</option><option>Usado</option><option>Recondicionado</option></select></div><div><label className={label} htmlFor="vehicleFuel">Combustível</label><select id="vehicleFuel" className={field} value={form.fuel} onChange={(e) => setForm({ ...form, fuel: e.target.value })}><option value="">Selecionar</option><option>Gasolina</option><option>Gasóleo</option><option>Elétrico</option><option>Híbrido</option><option>GPL</option></select></div>
                      <div className="sm:col-span-2"><label className={label} htmlFor="vehicleTransmission">Transmissão</label><select id="vehicleTransmission" className={field} value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })}><option value="">Selecionar</option><option>Manual</option><option>Automática</option></select></div></div>
                    </fieldset>}
                    {form.categoryName === "Imóveis e arrendamento" && <fieldset className="space-y-4 rounded-xl border border-[var(--theme-border)] p-4"><legend className={label}>Detalhes do imóvel</legend>
                      <div className="grid gap-4 sm:grid-cols-2"><div><label className={label} htmlFor="propertyType">Tipo de imóvel</label><select id="propertyType" className={field} value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })}><option>Apartamento</option><option>Casa</option><option>Vivenda</option><option>Quarto</option><option>Terreno residencial</option><option>Loja</option><option>Espaço comercial</option><option>Escritório</option><option>Armazém</option><option>Armazém logístico</option><option>Centro de distribuição</option><option>Pavilhão industrial</option><option>Fábrica</option><option>Terreno industrial</option><option>Terreno agrícola</option><option>Quinta</option><option>Espaço para eventos</option><option>Hotel ou pensão</option></select></div><div><label className={label} htmlFor="transactionType">Finalidade</label><select id="transactionType" className={field} value={form.transactionType} onChange={(e) => setForm({ ...form, transactionType: e.target.value })}><option>Arrendamento</option><option>Venda</option></select></div>
                      <div><label className={label} htmlFor="propertyBedrooms">Quartos</label><input id="propertyBedrooms" className={field} type="number" min="0" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} /></div><div><label className={label} htmlFor="propertyBathrooms">Casas de banho</label><input id="propertyBathrooms" className={field} type="number" min="0" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} /></div>
                      <div><label className={label} htmlFor="propertyArea">Área (m²)</label><input id="propertyArea" className={field} type="number" min="1" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></div><div><label className={label} htmlFor="propertyLocation">Localização</label><input id="propertyLocation" className={field} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Município, bairro" /></div></div>
                    </fieldset>}
                    {form.categoryName.startsWith("Serviços") && <fieldset className="space-y-4 rounded-xl border border-[var(--theme-border)] p-4"><legend className={label}>Detalhes do serviço</legend>
                      <div className="grid gap-4 sm:grid-cols-2"><div><label className={label} htmlFor="serviceAvailability">Disponibilidade</label><input id="serviceAvailability" className={field} value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} placeholder="Ex.: Segunda a sábado" /></div><div><label className={label} htmlFor="serviceDuration">Duração estimada</label><input id="serviceDuration" className={field} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="Ex.: 2 horas" /></div></div>
                    </fieldset>}
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
                        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-medium text-[var(--theme-text)]">{product.name}</h3><span className="rounded-full border border-[var(--theme-border)] px-2 py-1 text-[9px] uppercase tracking-[0.15em] text-[var(--theme-text-muted)]">{product.status}</span></div><p className="mt-1 text-sm text-[var(--theme-text-muted)]">{new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 }).format(product.price)} · Stock {product.stock}</p><p className="mt-1 text-xs text-[var(--theme-text-faint)]">{product.category?.name ?? "Sem categoria"} · SKU {product.sku}</p>{product.attributes?.galleryImages && (() => { try { const gallery = JSON.parse(product.attributes.galleryImages) as string[]; return gallery.length > 1 ? <div className="mt-3 flex gap-2 overflow-x-auto">{gallery.map((url, index) => <img key={url} src={url} alt={`Fotografia ${index + 1} de ${product.name}`} className="h-14 w-14 shrink-0 rounded-lg border border-[var(--theme-border)] object-cover" />)}</div> : null; } catch { return null; } })()}
                        {product.attributes && Object.keys(product.attributes).some((key) => key !== "galleryImages") && <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-[var(--theme-background)] p-3 sm:grid-cols-3">{Object.entries(product.attributes).filter(([key]) => key !== "galleryImages").map(([key, value]) => <div key={key} className="min-w-0"><dt className="truncate text-[9px] uppercase tracking-[0.12em] text-[var(--theme-text-faint)]">{({brand:"Marca",model:"Modelo",year:"Ano",mileage:"Quilometragem",condition:"Estado",fuel:"Combustível",transmission:"Transmissão",propertyType:"Tipo de imóvel",transactionType:"Finalidade",bedrooms:"Quartos",bathrooms:"Casas de banho",area:"Área (m²)",location:"Localização",serviceType:"Serviço",availability:"Disponibilidade",duration:"Duração",productType:"Tipo de produto",unit:"Unidade de venda",capacity:"Capacidade / medida"} as Record<string,string>)[key] ?? key}</dt><dd className="mt-1 truncate text-xs text-[var(--theme-text)]">{value}</dd></div>)}</dl>}<div className="mt-3 flex flex-wrap gap-2"><button onClick={() => beginEdit(product)} className="rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-[10px] text-[var(--theme-text)]">Editar</button>{product.status === "DRAFT" && <button onClick={() => void productAction(product.id, "publish")} className="rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-[10px] text-[var(--theme-text)]">Publicar</button>}{product.status !== "ARCHIVED" && <button onClick={() => void productAction(product.id, "archive")} className="rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-[10px] text-[var(--theme-text-muted)]">Arquivar</button>}</div>{editingProductId === product.id && <div className="mt-4 grid w-full gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] p-4"><label className="text-xs text-[var(--theme-text-muted)]">Nome<input className="mt-1 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></label><label className="text-xs text-[var(--theme-text-muted)]">Descrição<textarea className="mt-1 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm" rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></label><div className="grid grid-cols-2 gap-3"><label className="text-xs text-[var(--theme-text-muted)]">Preço (Kz)<input type="number" min="0.01" step="0.01" className="mt-1 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} /></label><label className="text-xs text-[var(--theme-text-muted)]">Stock<input type="number" min="0" step="1" className="mt-1 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} /></label></div><label className="text-xs text-[var(--theme-text-muted)]">URL da imagem<input type="url" className="mt-1 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm" value={editForm.image} onChange={(e) => setEditForm({ ...editForm, image: e.target.value })} /></label><label className="text-xs text-[var(--theme-text-muted)]">Especificações estruturadas (JSON)<textarea rows={6} spellCheck={false} className="mt-1 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 font-mono text-xs" value={editForm.attributesJson} onChange={(e) => setEditForm({ ...editForm, attributesJson: e.target.value })} /><span className="mt-1 block text-[10px]">Edite os campos técnicos do anúncio. Use pares de chave e valor em texto.</span></label><div className="flex gap-2"><button disabled={saving || editForm.name.trim().length < 2 || !editForm.price || Number(editForm.price) <= 0 || !editForm.stock || Number(editForm.stock) < 0} onClick={() => void saveProductEdit(product.id)} className="rounded-full bg-[var(--theme-text)] px-4 py-2 text-xs font-semibold text-[var(--theme-background)] disabled:opacity-50">{saving ? "A guardar…" : "Guardar alterações"}</button><button onClick={() => setEditingProductId(null)} className="rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs">Cancelar</button></div></div>}</div>
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
