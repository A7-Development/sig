# 🎨 Design System Completo - Sistema Integrado de Gestão (SIG)

**Documento Único e Completo** com todas as especificações visuais, componentes, layout e padrões para replicação em novos projetos.

**Identidade Visual:** Alert Brasil (tons de laranja)

---

## 📋 Índice

1. [Stack Técnica](#stack-técnica)
2. [Configurações Base](#configurações-base)
3. [Sistema de Cores](#sistema-de-cores)
4. [Tipografia](#tipografia)
5. [Sidebar - Especificações Completas](#sidebar---especificações-completas)
6. [Tabelas - Especificações Completas](#tabelas---especificações-completas)
7. [Layout e Estrutura](#layout-e-estrutura)
8. [Componentes UI](#componentes-ui)
9. [Padrões Visuais](#padrões-visuais)
10. [Dependências](#dependências)

---

## 🚀 Stack Técnica

### Framework e Bibliotecas Core
- **Next.js 16** (App Router) com React 19
- **TypeScript** (strict mode)
- **Tailwind CSS 4** para styling (configuração via CSS)
- **Shadcn/ui** para componentes base (style: "new-york")
- **Lucide React** para ícones (todos os ícones são do Lucide)
- **React Hook Form + Zod 4** para validação de formulários
- **TanStack Table v8** para tabelas avançadas (DataTable)
- **TanStack Query v5** para gerenciamento de estado server-side
- **Sonner** para toasts/notificações
- **Zustand** para gerenciamento de estado client-side

### Path Aliases
```typescript
@/components    -> src/components/
@/lib          -> src/lib/
@/hooks        -> src/hooks/
@/stores       -> src/stores/
@/app          -> src/app/
```

---

## ⚙️ Configurações Base

### 1. Tailwind CSS v4 - Configuração via CSS

**IMPORTANTE:** O Tailwind CSS v4 não usa mais `tailwind.config.ts`. Toda a configuração é feita diretamente no arquivo CSS.

**Arquivo:** `src/app/globals.css`

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* Mapeamento de variáveis CSS para Tailwind v4 */
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  
  /* Cores para gráficos */
  --color-chart-1: hsl(var(--chart-1));
  --color-chart-2: hsl(var(--chart-2));
  --color-chart-3: hsl(var(--chart-3));
  --color-chart-4: hsl(var(--chart-4));
  --color-chart-5: hsl(var(--chart-5));
  
  /* Cores do Sidebar */
  --color-sidebar: hsl(var(--sidebar-background));
  --color-sidebar-foreground: hsl(var(--sidebar-foreground));
  --color-sidebar-primary: hsl(var(--sidebar-primary));
  --color-sidebar-primary-foreground: hsl(var(--sidebar-primary-foreground));
  --color-sidebar-accent: hsl(var(--sidebar-accent));
  --color-sidebar-accent-foreground: hsl(var(--sidebar-accent-foreground));
  --color-sidebar-border: hsl(var(--sidebar-border));
  --color-sidebar-ring: hsl(var(--sidebar-ring));
  
  /* Raios de borda */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  
  /* Fontes */
  --font-sans: var(--font-inter);
  --font-mono: var(--font-geist-mono);
}
```

### 2. Sintaxe Tailwind v4

**Diferenças importantes do Tailwind v3:**

```css
/* Tailwind v3 */
w-[var(--sidebar-width)]

/* Tailwind v4 - Nova sintaxe */
w-(--sidebar-width)
```

### 3. `components.json` (Shadcn/ui)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### 4. `lib/utils.ts`

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**OBRIGATÓRIO:** Esta função `cn()` é essencial para mesclar classes Tailwind corretamente em todos os componentes.

---

## 🎨 Sistema de Cores

### Paleta Alert Brasil (Tema Claro)

```css
:root {
  /* Paleta corporativa - tons de cinza, laranja Alert Brasil */
  --background: 0 0% 98%;              /* #FAFAFA - Fundo claro */
  --foreground: 210 11% 15%;           /* #1F2937 - Texto escuro */
  --card: 0 0% 100%;                   /* #FFFFFF - Cards brancos */
  --card-foreground: 210 11% 15%;
  --popover: 0 0% 100%;
  --popover-foreground: 210 11% 15%;
  --primary: 221 50% 55%;              /* Azul corporativo */
  --primary-foreground: 0 0% 98%;
  --secondary: 210 16% 93%;            /* Cinza muito claro */
  --secondary-foreground: 210 11% 15%;
  --muted: 210 16% 95%;                /* Fundo muted */
  --muted-foreground: 210 7% 46%;      /* Texto muted */
  --accent: 210 16% 93%;
  --accent-foreground: 210 11% 15%;
  --destructive: 0 65% 51%;            /* #DC2626 - Vermelho erro */
  --destructive-foreground: 0 0% 98%;
  --border: 210 20% 88%;               /* #D1D5DB - Bordas */
  --input: 210 20% 88%;
  --ring: 221 50% 55%;                 /* Ring de foco */
  --radius: 0.375rem;                  /* 6px - Raio padrão */
  
  /* Cores para gráficos - Paleta vibrante */
  --chart-1: 221 70% 45%;              /* Azul */
  --chart-2: 142 71% 45%;              /* Verde */
  --chart-3: 262 52% 47%;              /* Roxo */
  --chart-4: 38 92% 50%;               /* Laranja */
  --chart-5: 340 82% 52%;              /* Rosa */
  
  /* Sidebar Alert Brasil - Laranja */
  --sidebar-background: 0 0% 100%;
  --sidebar-foreground: 210 11% 15%;
  --sidebar-primary: 30 90% 50%;       /* Laranja Alert */
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 30 100% 95%;       /* Laranja claro */
  --sidebar-accent-foreground: 30 80% 35%;
  --sidebar-border: 210 20% 90%;
  --sidebar-ring: 30 90% 50%;
}
```

### Tema Escuro

```css
.dark {
  --background: 210 11% 4%;
  --foreground: 0 0% 95%;
  --card: 210 11% 6%;
  --card-foreground: 0 0% 95%;
  --popover: 210 11% 6%;
  --popover-foreground: 0 0% 95%;
  --primary: 210 100% 60%;
  --primary-foreground: 210 11% 4%;
  --secondary: 210 11% 10%;
  --secondary-foreground: 0 0% 95%;
  --muted: 210 11% 10%;
  --muted-foreground: 210 7% 65%;
  --accent: 210 11% 10%;
  --accent-foreground: 0 0% 95%;
  --destructive: 0 65% 51%;
  --destructive-foreground: 0 0% 95%;
  --border: 210 11% 15%;
  --input: 210 11% 15%;
  --ring: 210 100% 60%;
  
  /* Gráficos - Dark Mode */
  --chart-1: 221 80% 60%;
  --chart-2: 142 60% 50%;
  --chart-3: 262 60% 55%;
  --chart-4: 38 85% 55%;
  --chart-5: 340 75% 58%;
  
  /* Sidebar Dark - Laranja */
  --sidebar-background: 210 11% 8%;
  --sidebar-foreground: 0 0% 95%;
  --sidebar-primary: 30 90% 55%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 30 30% 15%;
  --sidebar-accent-foreground: 30 90% 70%;
  --sidebar-border: 210 11% 15%;
  --sidebar-ring: 30 90% 55%;
}
```

### Cores Contextuais para UI

```tsx
// Ações principais - Laranja Alert Brasil
<div className="bg-orange-100 text-orange-600">
  <Plus className="h-4 w-4" />
</div>

// Estatísticas positivas - Verde
<div className="bg-green-100 text-green-600">
  <BarChart className="h-4 w-4" />
</div>

// Edição/Atenção - Âmbar
<div className="bg-amber-100 text-amber-600">
  <Edit className="h-4 w-4" />
</div>

// Empresas - Roxo
<div className="bg-purple-100 text-purple-600">
  <Building2 className="h-4 w-4" />
</div>

// Erros/Exclusão - Vermelho
<div className="bg-red-50 border-red-200 text-red-700">
  Mensagem de erro
</div>

// Valores monetários
<span className="text-green-600 font-semibold">+R$ 1.234,56</span>  // Positivo
<span className="text-red-600 font-semibold">-R$ 1.234,56</span>    // Negativo
```

---

## 📝 Tipografia

### Fontes

```typescript
// layout.tsx
import { Inter, Geist_Mono } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

### Escalas de Tamanho

| Uso | Classe CSS | Classe Utilitária | Tamanho |
|-----|------------|-------------------|---------|
| Títulos principais | `text-2xl font-bold tracking-tight` | `.page-title` | 24px |
| Títulos de seção | `text-xl font-semibold` | `.section-title` | 20px |
| Títulos de card | `text-base font-semibold` | `.card-title` | 16px |
| Texto padrão | `text-sm` | `.text-body` | 14px |
| Descrições | `text-xs text-muted-foreground` | — | 12px |
| Labels de tabela | `text-xs font-semibold` | `.table-label` | 12px |
| Labels de filtros | `text-[10px] uppercase tracking-wider` | `.filter-label` | 10px |
| Valores monetários | `font-mono text-sm tabular-nums` | `.value-currency` | 14px mono |

### Exemplos de Uso

```tsx
// Título de página
<h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

// Subtítulo
<p className="text-sm text-muted-foreground">Descrição da página</p>

// Label de filtro
<label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
  Período
</label>

// Valor monetário
<span className="font-mono text-sm">R$ 1.234,56</span>
```

---

## 📱 Sidebar - Especificações Completas

### Dimensões

```typescript
SIDEBAR_WIDTH = '16rem'           // 256px - Expandido
SIDEBAR_WIDTH_MOBILE = '18rem'    // 288px - Mobile (Sheet)
SIDEBAR_WIDTH_ICON = '3rem'       // 48px - Colapsado
```

### Comportamento

- **Modo colapsável**: `collapsible="icon"`
- **Estados**: `expanded` | `collapsed`
- **Persistência**: Cookie `sidebar_state` (7 dias)
- **Atalho**: `Ctrl/Cmd + B`
- **Responsivo**: Sheet em mobile

### Cores Alert Brasil

```tsx
// Header com ícone laranja
<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 shrink-0">
  <ModuleIcon className="h-4 w-4" />
</div>

// Item ativo
className="bg-orange-100 text-orange-700 hover:bg-orange-100 hover:text-orange-700"

// Item hover
className="hover:bg-orange-50 hover:text-orange-600"

// Avatar do usuário
<div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-700">
  {user.name.charAt(0)}
</div>
```

### Estrutura do Menu

```tsx
<Sidebar collapsible="icon" className="border-r border-border">
  <SidebarHeader className="border-b border-border">
    {/* Logo + Nome do módulo */}
  </SidebarHeader>
  
  <SidebarContent>
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Menu Principal
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {/* Items aqui */}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  </SidebarContent>
  
  <SidebarFooter className="border-t border-border">
    {/* Usuário + Logout */}
  </SidebarFooter>
  
  <SidebarRail />
</Sidebar>
```

---

## 📊 Tabelas - Especificações Completas

### 1. Componente Table Base

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"

<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="w-40">Nome</TableHead>
      <TableHead>Descrição</TableHead>
      <TableHead className="text-right">Valor</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="font-medium">Item 1</TableCell>
      <TableCell>Descrição do item</TableCell>
      <TableCell className="text-right font-mono">R$ 1.234,56</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### 2. Estilos Corporativos Compactos (`.corporate-table`)

```css
.corporate-table {
  @apply text-xs;
}

.corporate-table th {
  @apply py-1.5 px-2 text-xs font-medium text-muted-foreground bg-muted/50;
}

.corporate-table td {
  @apply py-1 px-2 text-xs border-b border-border/50;
}

.corporate-table tr:hover {
  @apply bg-muted/30;
}
```

**Uso:**
```tsx
<table className="w-full corporate-table">
  <thead>
    <tr>
      <th>Nome</th>
      <th className="text-right">Valor</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Item</td>
      <td className="text-right font-mono">R$ 1.234,56</td>
    </tr>
  </tbody>
</table>
```

### 3. Comparação de Tamanhos

| Tipo | Header | Células | Texto |
|------|--------|---------|-------|
| **Table padrão** | `h-10 px-2` | `p-2` | `text-sm` |
| **corporate-table** | `py-1.5 px-2` | `py-1 px-2` | `text-xs` |

### 4. Padrões de Formatação

```tsx
// Valores monetários
<TableCell className="text-right font-mono">
  R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
</TableCell>

// Percentuais
<TableCell className="text-right">
  {(percentual * 100).toFixed(2)}%
</TableCell>

// Valores positivos/negativos
<TableCell className={cn(
  "text-right font-mono font-semibold",
  valor >= 0 ? "text-green-600" : "text-red-600"
)}>
  {valor >= 0 ? "+" : ""}{formatCurrency(valor)}
</TableCell>

// Zebrado
<TableRow className="odd:bg-white even:bg-muted/30">
```

### 5. Tabelas com Header Fixo

```tsx
<div className="max-h-[500px] overflow-auto">
  <Table>
    <TableHeader className="sticky top-0 bg-muted/20 backdrop-blur z-10">
      {/* Header */}
    </TableHeader>
    <TableBody>
      {/* Conteúdo scrollável */}
    </TableBody>
  </Table>
</div>
```

---

## 🏗️ Layout e Estrutura

### Layout Principal

```tsx
<SidebarProvider defaultOpen={true}>
  <AppSidebar />
  <SidebarInset>
    {/* Header */}
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />
        <Breadcrumb>...</Breadcrumb>
      </div>
      <UserMenu />
    </header>
    
    {/* Conteúdo */}
    <main className="flex-1 overflow-auto p-4 bg-background">
      {children}
    </main>
  </SidebarInset>
</SidebarProvider>
```

### Header Specifications

- **Altura**: `h-12` (48px)
- **Padding**: `px-4` (16px horizontal)
- **Border**: `border-b`
- **Background**: `bg-background`

### Container de Página

```tsx
// Container padrão
<div className="container mx-auto py-6 max-w-6xl">
  {/* Header da página */}
  <div className="mb-6">
    <h1 className="text-2xl font-bold tracking-tight">Título</h1>
    <p className="text-sm text-muted-foreground">Descrição</p>
  </div>
  
  {/* Conteúdo */}
  <Card>
    <CardHeader>
      <CardTitle>Título do Card</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Conteúdo */}
    </CardContent>
  </Card>
</div>
```

### Larguras Padrão

- `max-w-4xl` (896px): Upload, configurações
- `max-w-5xl` (1024px): Formulários, cards
- `max-w-6xl` (1152px): Listagens
- `max-w-7xl` (1280px): Dashboards

---

## 🧩 Componentes UI

### Button

```tsx
// Tamanhos disponíveis
<Button size="xs">Extra Pequeno</Button>  // h-7, text-xs
<Button size="sm">Pequeno</Button>        // h-8
<Button size="default">Padrão</Button>    // h-9
<Button size="lg">Grande</Button>         // h-10

// Ícones
<Button size="icon-xs">🔧</Button>        // 28x28
<Button size="icon-sm">🔧</Button>        // 32x32
<Button size="icon">🔧</Button>           // 36x36

// Variantes padrão
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="link">Link</Button>

// Variantes customizadas Alert Brasil
<Button variant="success">Salvar</Button>   // Verde
<Button variant="alert">Destaque</Button>   // Laranja
```

### Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>Título (text-base, 16px)</CardTitle>
    <CardDescription>Descrição (text-xs, 12px)</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Conteúdo com p-4 */}
  </CardContent>
  <CardFooter>
    {/* Ações com border-t */}
  </CardFooter>
</Card>
```

**Estilos aplicados automaticamente:**
- `CardHeader`: `p-4 border-b bg-muted/10`
- `CardTitle`: `text-base font-semibold`
- `CardDescription`: `text-xs text-muted-foreground`
- `CardContent`: `p-4`
- `CardFooter`: `p-4 border-t bg-muted/5`

### Badge

```tsx
<Badge variant="default">Ativo</Badge>      // Primary
<Badge variant="secondary">Pendente</Badge> // Cinza
<Badge variant="destructive">Erro</Badge>   // Vermelho
<Badge variant="outline">Info</Badge>       // Outline

// Customizado Alert Brasil
<Badge className="bg-orange-100 text-orange-700 border-orange-200">
  Alert
</Badge>
```

### Input

```tsx
// Padrão (h-9)
<Input placeholder="Digite..." />

// Compacto para filtros (h-8)
<Input className="h-8 text-xs" placeholder="Buscar..." />
```

### Select

```tsx
<Select>
  <SelectTrigger className="h-8 text-xs">
    <SelectValue placeholder="Selecione..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Opção 1</SelectItem>
    <SelectItem value="2">Opção 2</SelectItem>
  </SelectContent>
</Select>
```

### Alert

```tsx
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Erro</AlertTitle>
  <AlertDescription>Mensagem de erro detalhada.</AlertDescription>
</Alert>
```

### Toasts (Sonner)

```tsx
import { toast } from "sonner"

// Sucesso
toast.success("Operação realizada", {
  description: "Os dados foram salvos com sucesso."
})

// Erro
toast.error("Erro ao processar", {
  description: "Verifique os dados e tente novamente."
})

// Warning
toast.warning("Atenção", {
  description: "Ação requer confirmação."
})
```

---

## 🎯 Padrões Visuais

### Bordas e Raios

```css
--radius: 0.375rem;  /* 6px - Padrão */

/* Classes */
rounded-sm: 2px
rounded-md: 4px
rounded-lg: 6px (--radius)
rounded-xl: 10px
```

### Shadows

```css
shadow-xs   /* Inputs */
shadow-sm   /* Cards */
shadow      /* Cards hover */
shadow-lg   /* Modais, dropdowns */
```

### Spacing

```css
/* Padding */
p-2: 8px    /* Compacto */
p-4: 16px   /* Padrão */
p-6: 24px   /* Cards */

/* Gap */
gap-2: 8px   /* Entre elementos pequenos */
gap-4: 16px  /* Entre elementos médios */
gap-6: 24px  /* Entre seções */
```

### Estados Vazios

```tsx
<div className="empty-state">
  <FileX className="h-12 w-12 text-muted-foreground/50 mb-4" />
  <p className="empty-state-title">Nenhum registro encontrado</p>
  <p className="empty-state-description">
    Adicione um novo item para começar.
  </p>
</div>
```

```css
.empty-state {
  @apply rounded-lg border border-dashed border-muted-foreground/30 
         bg-muted/5 p-12 text-center flex flex-col items-center;
}
.empty-state-title {
  @apply text-sm font-medium text-muted-foreground;
}
.empty-state-description {
  @apply mt-1.5 text-xs text-muted-foreground/80;
}
```

### Loading States

```tsx
// Skeleton para tabelas
<Skeleton className="h-8 w-full" />

// Skeleton para cards
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-48" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-32 w-full" />
  </CardContent>
</Card>
```

---

## 📦 Dependências

### package.json

```json
{
  "dependencies": {
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/react-*": "versões do shadcn/ui",
    "@tanstack/react-query": "^5.90.12",
    "@tanstack/react-table": "^8.x",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.561.0",
    "next": "^16.0.10",
    "react": "^19.2.1",
    "react-dom": "^19.2.1",
    "react-hook-form": "^7.68.0",
    "sonner": "^1.7.4",
    "tailwind-merge": "^3.4.0",
    "zod": "^4.1.13",
    "zustand": "^5.0.9"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "eslint": "^9",
    "tailwindcss": "^4",
    "tw-animate-css": "^1.4.0",
    "typescript": "^5"
  }
}
```

### Instalação Shadcn/ui

```bash
npx shadcn@latest init
npx shadcn@latest add button card input label select table badge alert dialog sidebar breadcrumb collapsible separator sonner tooltip dropdown-menu sheet skeleton avatar form
```

---

## ✅ Checklist de Implementação

### 1. Configuração Base
- [ ] Configurar `globals.css` com Tailwind v4
- [ ] Criar `lib/utils.ts` com função `cn()`
- [ ] Instalar dependências

### 2. Componentes UI
- [ ] Instalar componentes shadcn necessários
- [ ] Verificar estilos do sidebar
- [ ] Configurar toasts (Sonner)

### 3. Cores Alert Brasil
- [ ] Variáveis CSS de sidebar com laranja
- [ ] Ícones e badges com bg-orange-100
- [ ] Estados hover com orange-50/orange-600

### 4. Layout
- [ ] AppSidebar com cores Alert
- [ ] Header com h-12 e breadcrumbs
- [ ] Container de página com max-w-6xl

### 5. Tabelas
- [ ] Componente Table instalado
- [ ] Estilos .corporate-table no globals.css
- [ ] Formatação de valores monetários

---

## 📝 Regras Importantes

1. **Função `cn()` é OBRIGATÓRIA** em todos os componentes.

2. **Tailwind v4** não usa `tailwind.config.ts` - configuração via CSS.

3. **Cores Alert Brasil**: Usar tons de laranja para elementos de destaque.

4. **Tabelas**: Use `Table` para simples, `.corporate-table` para compactas.

5. **Valores monetários**: Sempre usar `font-mono` e cores semânticas.

6. **Gráficos**: NUNCA usar 0 como valor padrão - mostrar apenas dados reais.

---

**Este documento contém todas as informações necessárias para replicar o design system completo em um novo projeto.**
