import type { PlatformLanguage } from "./PlatformPreferencesProvider";

export const platformTranslations = {
  pt: { executiveWorkspace:"Espaço Executivo", globalPlatform:"Plataforma Global", search:"Pesquisar MARKA", account:"Conta", user:"Utilizador MARKA", theme:"Tema", language:"Idioma", themeBlue:"Azul Atlântico", themeObsidian:"Obsidian", themeGraphite:"Graphite", themeSilver:"Silver", themeAurora:"Aurora", themePearl:"Pérola", marketplaceTitle:"MARKA Marketplace", marketplaceSubtitle:"Produtos selecionados de vendedores digitais de confiança.", marketplaceSearch:"Pesquisar produtos, lojas e categorias...", verifiedVendors:"Vendedores verificados", latest:"Mais recentes", priceLowHigh:"Preço: menor para maior", priceHighLow:"Preço: maior para menor", noProducts:"Nenhum produto encontrado.", loadingMarketplace:"A carregar o marketplace...", product:"Produto", stock:"Stock", addToCart:"Adicionar ao carrinho", premiumMarketplace:"Comércio global, curado com confiança." },
  en: { executiveWorkspace:"Executive Workspace", globalPlatform:"Global Platform", search:"Search MARKA", account:"Account", user:"MARKA User", theme:"Theme", language:"Language", themeBlue:"Atlantic Blue", themeObsidian:"Obsidian", themeGraphite:"Graphite", themeSilver:"Silver", themeAurora:"Aurora", themePearl:"Pearl", marketplaceTitle:"MARKA Marketplace", marketplaceSubtitle:"Curated products from trusted digital vendors.", marketplaceSearch:"Search products, stores and categories...", verifiedVendors:"Verified vendors", latest:"Latest", priceLowHigh:"Price: Low to High", priceHighLow:"Price: High to Low", noProducts:"No products found.", loadingMarketplace:"Loading marketplace...", product:"Product", stock:"Stock", addToCart:"Add to cart", premiumMarketplace:"Global commerce, curated for trust." },
  fr: { executiveWorkspace:"Espace Exécutif", globalPlatform:"Plateforme Globale", search:"Rechercher MARKA", account:"Compte", user:"Utilisateur MARKA", theme:"Thème", language:"Langue", themeBlue:"Bleu Atlantique", themeObsidian:"Obsidienne", themeGraphite:"Graphite", themeSilver:"Argent", themeAurora:"Aurore", themePearl:"Perle", marketplaceTitle:"Marketplace MARKA", marketplaceSubtitle:"Produits sélectionnés auprès de vendeurs numériques de confiance.", marketplaceSearch:"Rechercher des produits, boutiques et catégories...", verifiedVendors:"Vendeurs vérifiés", latest:"Plus récents", priceLowHigh:"Prix : croissant", priceHighLow:"Prix : décroissant", noProducts:"Aucun produit trouvé.", loadingMarketplace:"Chargement du marketplace...", product:"Produit", stock:"Stock", addToCart:"Ajouter au panier", premiumMarketplace:"Commerce mondial, sélectionné avec confiance." },
  zh: { executiveWorkspace:"执行工作区", globalPlatform:"全球平台", search:"搜索 MARKA", account:"账户", user:"MARKA 用户", theme:"主题", language:"语言", themeBlue:"大西洋蓝", themeObsidian:"黑曜石", themeGraphite:"石墨", themeSilver:"银色", themeAurora:"极光", themePearl:"珍珠", marketplaceTitle:"MARKA 商城", marketplaceSubtitle:"精选可信数字商户商品。", marketplaceSearch:"搜索商品、商店和分类...", verifiedVendors:"已认证商户", latest:"最新", priceLowHigh:"价格从低到高", priceHighLow:"价格从高到低", noProducts:"未找到商品。", loadingMarketplace:"正在加载商城...", product:"商品", stock:"库存", addToCart:"加入购物车", premiumMarketplace:"全球商业，精选可信。" },
  ar: { executiveWorkspace:"مساحة العمل التنفيذية", globalPlatform:"المنصة العالمية", search:"البحث في MARKA", account:"الحساب", user:"مستخدم MARKA", theme:"المظهر", language:"اللغة", themeBlue:"الأزرق الأطلسي", themeObsidian:"أوبسيديان", themeGraphite:"غرافيت", themeSilver:"فضي", themeAurora:"الشفق", themePearl:"لؤلؤي", marketplaceTitle:"سوق MARKA", marketplaceSubtitle:"منتجات مختارة من تجار رقميين موثوقين.", marketplaceSearch:"ابحث عن المنتجات والمتاجر والفئات...", verifiedVendors:"تجار موثقون", latest:"الأحدث", priceLowHigh:"السعر: من الأقل إلى الأعلى", priceHighLow:"السعر: من الأعلى إلى الأقل", noProducts:"لم يتم العثور على منتجات.", loadingMarketplace:"جارٍ تحميل السوق...", product:"منتج", stock:"المخزون", addToCart:"أضف إلى السلة", premiumMarketplace:"تجارة عالمية، مختارة بثقة." },
  os: { executiveWorkspace:"Omukalo wOshigwana", globalPlatform:"Oshikandjo shOshigwana", search:"Londula MARKA", account:"Akaunti", user:"Omukwatithi wa MARKA", theme:"Omushindo", language:"Olyelyo", themeBlue:"Atlantic Blue", themeObsidian:"Obsidian", themeGraphite:"Graphite", themeSilver:"Silver", themeAurora:"Aurora", themePearl:"Ombili", marketplaceTitle:"MARKA Marketplace", marketplaceSubtitle:"Omitumba dhiinwa poovendor digital va nawa.", marketplaceSearch:"Londula omitumba, omashop na categories...", verifiedVendors:"Omapoovendor wa verified", latest:"Ombinga yape", priceLowHigh:"Oimaliwa: sha pumbwa", priceHighLow:"Oimaliwa: sha dula", noProducts:"Kape na product i li nawa.", loadingMarketplace:"Tate load-a marketplace...", product:"Product", stock:"Stock", addToCart:"Tula koshi cart", premiumMarketplace:"Oshilonga shoshigwana, sha holoka na trust." },
} satisfies Record<PlatformLanguage, Record<string, string>>;


const messageTranslations = {
  pt: { section:"MARKA / COMUNICAÇÃO", title:"Mensagens", subtitle:"Converse com compradores, vendedores, motoristas e profissionais seleccionados em canais privados autorizados.", count:"conversas", inbox:"Caixa de entrada", loading:"A carregar conversas…", empty:"Ainda não tens conversas.", emptyHint:"Abre um produto, uma viagem ativa ou uma entrega para iniciar uma conversa privada com os participantes autorizados.", start:"Inicia a conversa", viewProduct:"Ver produto", edit:"Editar", edited:"Editada", cancel:"Cancelar", save:"Guardar", saving:"A guardar…", first:"Envia a primeira mensagem desta conversa.", placeholder:"Escreve uma mensagem…", sending:"A enviar…", send:"Enviar", safety:"Proteção MARKA: contactos externos, links de redes sociais, pagamentos fora da plataforma e credenciais são bloqueados. Nunca partilhes palavras-passe, PIN, OTP, códigos de recuperação ou dados bancários. Conclui sempre a compra no checkout MARKA.", inboxTitle:"A tua caixa de entrada", inboxHint:"Selecciona uma conversa do Marketplace, Mobility ou Delivery. As conversas são disponibilizadas apenas aos participantes autorizados de cada transação ou serviço.", loadingInbox:"A carregar a caixa de entrada…", editLabel:"Editar mensagem" },
  en: { section:"MARKA / COMMUNICATION", title:"Messages", subtitle:"Chat with buyers, sellers, drivers and selected professionals in authorized private channels.", count:"conversations", inbox:"Inbox", loading:"Loading conversations…", empty:"You have no conversations yet.", emptyHint:"Open a product, active ride or delivery to start a private conversation with authorized participants.", start:"Start conversation", viewProduct:"View product", edit:"Edit", edited:"Edited", cancel:"Cancel", save:"Save", saving:"Saving…", first:"Send the first message in this conversation.", placeholder:"Write a message…", sending:"Sending…", send:"Send", safety:"MARKA protection: external contacts, social links, off-platform payments and credentials are blocked. Never share passwords, PINs, OTPs, recovery codes or bank details. Always complete purchases through MARKA checkout.", inboxTitle:"Your inbox", inboxHint:"Select a Marketplace, Mobility or Delivery conversation. Conversations are available only to participants authorized for each transaction or service.", loadingInbox:"Loading inbox…", editLabel:"Edit message" },
  fr: { section:"MARKA / COMMUNICATION", title:"Messages", subtitle:"Échangez avec les acheteurs, vendeurs, chauffeurs et professionnels autorisés dans des canaux privés.", count:"conversations", inbox:"Boîte de réception", loading:"Chargement des conversations…", empty:"Vous n’avez pas encore de conversations.", emptyHint:"Ouvrez un produit, un trajet actif ou une livraison pour démarrer une conversation privée avec les participants autorisés.", start:"Démarrer la conversation", viewProduct:"Voir le produit", edit:"Modifier", edited:"Modifié", cancel:"Annuler", save:"Enregistrer", saving:"Enregistrement…", first:"Envoyez le premier message de cette conversation.", placeholder:"Écrire un message…", sending:"Envoi…", send:"Envoyer", safety:"Protection MARKA : les contacts externes, liens sociaux, paiements hors plateforme et identifiants sont bloqués. Ne partagez jamais de mots de passe, PIN, OTP, codes de récupération ou coordonnées bancaires. Effectuez toujours vos achats via MARKA.", inboxTitle:"Votre boîte de réception", inboxHint:"Sélectionnez une conversation Marketplace, Mobility ou Delivery. Seuls les participants autorisés peuvent y accéder.", loadingInbox:"Chargement de la boîte de réception…", editLabel:"Modifier le message" },
  zh: { section:"MARKA / 通信", title:"消息", subtitle:"通过授权的私人频道与买家、卖家、司机及专业人员交流。", count:"个对话", inbox:"收件箱", loading:"正在加载对话…", empty:"暂时没有对话。", emptyHint:"打开商品、行程或配送即可与获授权的参与者开始私人对话。", start:"开始对话", viewProduct:"查看商品", edit:"编辑", edited:"已编辑", cancel:"取消", save:"保存", saving:"正在保存…", first:"发送此对话的第一条消息。", placeholder:"输入消息…", sending:"正在发送…", send:"发送", safety:"MARKA 安全保护：禁止外部联系方式、社交链接、站外付款和凭据。切勿分享密码、PIN、OTP、恢复码或银行信息。请始终通过 MARKA 结账。", inboxTitle:"你的收件箱", inboxHint:"选择 Marketplace、Mobility 或 Delivery 对话。只有获授权的交易或服务参与者可以访问。", loadingInbox:"正在加载收件箱…", editLabel:"编辑消息" },
  ar: { section:"MARKA / الاتصالات", title:"الرسائل", subtitle:"تواصل مع المشترين والبائعين والسائقين والمهنيين المختارين عبر قنوات خاصة مصرح بها.", count:"محادثات", inbox:"صندوق الوارد", loading:"جارٍ تحميل المحادثات…", empty:"لا توجد محادثات بعد.", emptyHint:"افتح منتجًا أو رحلة نشطة أو عملية توصيل لبدء محادثة خاصة مع المشاركين المصرح لهم.", start:"بدء المحادثة", viewProduct:"عرض المنتج", edit:"تعديل", edited:"تم التعديل", cancel:"إلغاء", save:"حفظ", saving:"جارٍ الحفظ…", first:"أرسل أول رسالة في هذه المحادثة.", placeholder:"اكتب رسالة…", sending:"جارٍ الإرسال…", send:"إرسال", safety:"حماية MARKA: يتم حظر جهات الاتصال الخارجية وروابط التواصل الاجتماعي والمدفوعات خارج المنصة وبيانات الاعتماد. لا تشارك كلمات المرور أو PIN أو OTP أو رموز الاسترداد أو البيانات المصرفية. أكمل الشراء دائمًا عبر MARKA.", inboxTitle:"صندوق الوارد", inboxHint:"اختر محادثة Marketplace أو Mobility أو Delivery. الوصول متاح فقط للمشاركين المصرح لهم.", loadingInbox:"جارٍ تحميل صندوق الوارد…", editLabel:"تعديل الرسالة" }
} as const;
export function useMessagesTranslation(language: PlatformLanguage) {
  return messageTranslations[language as keyof typeof messageTranslations] ?? messageTranslations.pt;
}



// Extended module vocabulary. Keep UI labels in the selected account language;
// user-generated product, store and category names remain in their original language.
const marketplaceExtendedTranslations: Record<PlatformLanguage, Record<string, string>> = {
  pt: {
    openStore:"Abrir uma loja", sellOnMarka:"Vender na MARKA", curated:"Seleção editorial", curatedDetail:"Seleção editorial",
    verified:"Verificado", verifiedStores:"Lojas verificadas", local:"Local", localDetail:"Experiências em Angola",
    discover:"Descobrir", exploreMarketplace:"Explore o Marketplace.", activeOffers:"Produtos, lojas e categorias com oferta ativa.",
    filterOffers:"Filtrar ofertas", categories:"Categorias", selectedCategory:"Categoria selecionada",
    chooseCategories:"Escolha entre {count} categorias disponíveis", categoryCount:"categorias", allCategories:"Todas as categorias",
    seeAll:"Ver tudo", discoverMerchants:"Descobrir comerciantes", storesTitle:"Lojas no Marketplace",
    storesVisible:"Todas as lojas ativas são visíveis. O selo Verified distingue os vendedores que concluíram a verificação.",
    createMyStore:"Criar a minha loja", notVerified:"Loja não verificada", offersCount:"ofertas",
    noVerifiedStores:"Ainda não existem lojas verificadas para este filtro.",
    noPublicStores:"Ainda não existem lojas públicas com este termo de pesquisa.",
    noCategoryOffers:"Ainda não há ofertas nesta categoria.", nextDiscovery:"A sua próxima descoberta começa aqui.",
    seeAllCategories:"Ver todas as categorias", publishOffer:"Abrir loja ou publicar uma oferta",
    available:"Disponível", unavailable:"Indisponível", used:"Usado", refurbished:"Recondicionado", new:"Novo",
    noStock:"Sem stock", lastUnits:"Últimas {count} unidades", unitsAvailable:"{count} disponíveis",
    adding:"A adicionar...", signInToAdd:"Inicie sessão para adicionar produtos ao carrinho.",
    addFailed:"Não foi possível adicionar o produto.", addError:"Ocorreu um erro ao adicionar o produto.",
    addToCart:"Adicionar ao carrinho", stockLabel:"Stock: {count}",
  },
  en: {
    openStore:"Open a store", sellOnMarka:"Sell on MARKA", curated:"Curated", curatedDetail:"Editorial selection",
    verified:"Verified", verifiedStores:"Verified stores", local:"Local", localDetail:"Experiences in Angola",
    discover:"Discover", exploreMarketplace:"Explore the Marketplace.", activeOffers:"Products, stores and categories with active offers.",
    filterOffers:"Filter offers", categories:"Categories", selectedCategory:"Selected category",
    chooseCategories:"Choose from {count} available categories", categoryCount:"categories", allCategories:"All categories",
    seeAll:"View all", discoverMerchants:"Discover merchants", storesTitle:"Marketplace stores",
    storesVisible:"All active stores are visible. The Verified badge identifies sellers who completed verification.",
    createMyStore:"Create my store", notVerified:"Unverified store", offersCount:"offers",
    noVerifiedStores:"There are no verified stores for this filter yet.",
    noPublicStores:"There are no public stores matching this search yet.",
    noCategoryOffers:"There are no offers in this category yet.", nextDiscovery:"Your next discovery starts here.",
    seeAllCategories:"View all categories", publishOffer:"Open a store or publish an offer",
    available:"Available", unavailable:"Unavailable", used:"Used", refurbished:"Refurbished", new:"New",
    noStock:"Out of stock", lastUnits:"Only {count} left", unitsAvailable:"{count} available",
    adding:"Adding...", signInToAdd:"Sign in to add products to your cart.",
    addFailed:"Could not add the product.", addError:"An error occurred while adding the product.",
    addToCart:"Add to cart", stockLabel:"Stock: {count}",
  },
  fr: {
    openStore:"Ouvrir une boutique", sellOnMarka:"Vendre sur MARKA", curated:"Sélection", curatedDetail:"Sélection éditoriale",
    verified:"Vérifié", verifiedStores:"Boutiques vérifiées", local:"Local", localDetail:"Expériences en Angola",
    discover:"Découvrir", exploreMarketplace:"Explorez la Marketplace.", activeOffers:"Produits, boutiques et catégories avec des offres actives.",
    filterOffers:"Filtrer les offres", categories:"Catégories", selectedCategory:"Catégorie sélectionnée",
    chooseCategories:"Choisissez parmi {count} catégories disponibles", categoryCount:"catégories", allCategories:"Toutes les catégories",
    seeAll:"Tout voir", discoverMerchants:"Découvrir les commerçants", storesTitle:"Boutiques Marketplace",
    storesVisible:"Toutes les boutiques actives sont visibles. Le badge Verified distingue les vendeurs vérifiés.",
    createMyStore:"Créer ma boutique", notVerified:"Boutique non vérifiée", offersCount:"offres",
    noVerifiedStores:"Aucune boutique vérifiée pour ce filtre pour le moment.",
    noPublicStores:"Aucune boutique publique ne correspond à cette recherche.",
    noCategoryOffers:"Aucune offre dans cette catégorie pour le moment.", nextDiscovery:"Votre prochaine découverte commence ici.",
    seeAllCategories:"Voir toutes les catégories", publishOffer:"Ouvrir une boutique ou publier une offre",
    available:"Disponible", unavailable:"Indisponible", used:"Occasion", refurbished:"Reconditionné", new:"Neuf",
    noStock:"En rupture de stock", lastUnits:"Plus que {count}", unitsAvailable:"{count} disponibles",
    adding:"Ajout…", signInToAdd:"Connectez-vous pour ajouter des produits au panier.",
    addFailed:"Impossible d’ajouter le produit.", addError:"Une erreur est survenue lors de l’ajout.",
    addToCart:"Ajouter au panier", stockLabel:"Stock : {count}",
  },
  zh: {
    openStore:"开设商店", sellOnMarka:"在 MARKA 销售", curated:"精选", curatedDetail:"编辑精选",
    verified:"已认证", verifiedStores:"已认证商店", local:"本地", localDetail:"安哥拉体验",
    discover:"发现", exploreMarketplace:"探索 MARKA 商城。", activeOffers:"浏览有库存商品、商店和分类。",
    filterOffers:"筛选商品", categories:"分类", selectedCategory:"已选分类",
    chooseCategories:"从 {count} 个可用分类中选择", categoryCount:"个分类", allCategories:"所有分类",
    seeAll:"查看全部", discoverMerchants:"发现商家", storesTitle:"商城商店",
    storesVisible:"所有活跃商店均可见。Verified 标识表示卖家已完成认证。",
    createMyStore:"创建我的商店", notVerified:"未认证商店", offersCount:"个商品",
    noVerifiedStores:"此筛选条件下暂无已认证商店。",
    noPublicStores:"暂无符合此搜索条件的公开商店。",
    noCategoryOffers:"此分类暂无商品。", nextDiscovery:"下一次发现从这里开始。",
    seeAllCategories:"查看所有分类", publishOffer:"开设商店或发布商品",
    available:"有货", unavailable:"无货", used:"二手", refurbished:"翻新", new:"全新",
    noStock:"缺货", lastUnits:"仅剩 {count} 件", unitsAvailable:"有 {count} 件",
    adding:"正在添加…", signInToAdd:"请登录后将商品加入购物车。",
    addFailed:"无法添加商品。", addError:"添加商品时发生错误。",
    addToCart:"加入购物车", stockLabel:"库存：{count}",
  },
  ar: {
    openStore:"افتح متجرًا", sellOnMarka:"بع على MARKA", curated:"مختار", curatedDetail:"اختيار تحريري",
    verified:"موثّق", verifiedStores:"متاجر موثّقة", local:"محلي", localDetail:"تجارب في أنغولا",
    discover:"اكتشف", exploreMarketplace:"استكشف سوق MARKA.", activeOffers:"منتجات ومتاجر وفئات بعروض نشطة.",
    filterOffers:"تصفية العروض", categories:"الفئات", selectedCategory:"الفئة المحددة",
    chooseCategories:"اختر من بين {count} فئة متاحة", categoryCount:"فئات", allCategories:"كل الفئات",
    seeAll:"عرض الكل", discoverMerchants:"اكتشف التجار", storesTitle:"متاجر السوق",
    storesVisible:"جميع المتاجر النشطة ظاهرة. تشير شارة Verified إلى البائعين الذين أكملوا التحقق.",
    createMyStore:"أنشئ متجري", notVerified:"متجر غير موثّق", offersCount:"عروض",
    noVerifiedStores:"لا توجد متاجر موثّقة لهذا التصفية بعد.",
    noPublicStores:"لا توجد متاجر عامة تطابق عبارة البحث هذه.",
    noCategoryOffers:"لا توجد عروض في هذه الفئة بعد.", nextDiscovery:"اكتشافك القادم يبدأ من هنا.",
    seeAllCategories:"عرض كل الفئات", publishOffer:"افتح متجرًا أو انشر عرضًا",
    available:"متوفر", unavailable:"غير متوفر", used:"مستعمل", refurbished:"مجدّد", new:"جديد",
    noStock:"نفد المخزون", lastUnits:"تبقى {count} فقط", unitsAvailable:"متوفر {count}",
    adding:"جارٍ الإضافة…", signInToAdd:"سجّل الدخول لإضافة المنتجات إلى السلة.",
    addFailed:"تعذرت إضافة المنتج.", addError:"حدث خطأ أثناء إضافة المنتج.",
    addToCart:"أضف إلى السلة", stockLabel:"المخزون: {count}",
  },
  os: {
    openStore:"Opena shop", sellOnMarka:"Landula mo MARKA", curated:"Oshiwedha", curatedDetail:"Oshiwedha shomakanda",
    verified:"Verified", verifiedStores:"Omapoovendor wa verified", local:"PauAngola", localDetail:"Omapopya mu Angola",
    discover:"Londula", exploreMarketplace:"Londula MARKA Marketplace.", activeOffers:"Omitumba, omashop na categories dha li na offers.",
    filterOffers:"Filter-a offers", categories:"Categories", selectedCategory:"Category ya hololwa",
    chooseCategories:"Hoolola moma categories {count} a li po", categoryCount:"categories", allCategories:"Categories adhe",
    seeAll:"Monika adhe", discoverMerchants:"Londula ovashangi", storesTitle:"Omapoovendor mu Marketplace",
    storesVisible:"Omapoovendor adhe a li po. Verified badge o ulike ovashangi va hala verification.",
    createMyStore:"Panga shop yange", notVerified:"Shop inayi verified", offersCount:"offers",
    noVerifiedStores:"Kape na shop ya verified mo filter ei.", noPublicStores:"Kape na shop ya public ya search ei.",
    noCategoryOffers:"Kape na offers mu category ei.", nextDiscovery:"Oshilonga shoye shipe sha tameka peni.",
    seeAllCategories:"Monika categories adhe", publishOffer:"Panga shop nenge publish-a offer",
    available:"Opo", unavailable:"Kape po", used:"Used", refurbished:"Refurbished", new:"Ipe",
    noStock:"Kape na stock", lastUnits:"Oshigwana {count sha kala}", unitsAvailable:"{count} dhi li po",
    adding:"Tate tuu...", signInToAdd:"Inga mu account opo u tule product koshi cart.",
    addFailed:"Kape na oshikwashike shokutula product.", addError:"Oshikwashike sha holoka pa kutula product.",
    addToCart:"Tula koshi cart", stockLabel:"Stock: {count}",
  },
};

export function usePlatformTranslation(language: PlatformLanguage) {
  return { ...platformTranslations[language], ...marketplaceExtendedTranslations[language] };
}
