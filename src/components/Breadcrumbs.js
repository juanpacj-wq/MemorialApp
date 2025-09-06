"use client"

import { useRouter, usePathname } from "next/navigation"

const Breadcrumb = ({ customItems = [] }) => {
  const router = useRouter()
  const pathname = usePathname()

  const getDefaultBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean)
    const breadcrumbs = [
      {
        label: "Inicio",
        href: "/galeria",
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
            />
          </svg>
        ),
      },
    ]

    segments.forEach((segment, index) => {
      const href = "/" + segments.slice(0, index + 1).join("/")
      let label = segment

      // Customize labels based on routes
      switch (segment) {
        case "galeria":
          label = "Galería"
          break
        case "crear-arbol":
          label = "Crear Árbol"
          break
        case "editar-arbol":
          label = "Editar Árbol"
          break
        case "ver-arbol":
          label = "Ver en AR"
          break
        default:
          // For dynamic segments like IDs, keep them as is or customize
          if (segment.length > 10) {
            label = segment.substring(0, 8) + "..."
          }
      }

      breadcrumbs.push({
        label,
        href,
        isActive: index === segments.length - 1,
      })
    })

    return breadcrumbs
  }

  const breadcrumbs = customItems.length > 0 ? customItems : getDefaultBreadcrumbs()

  if (breadcrumbs.length <= 1) return null

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-6">
      {breadcrumbs.map((item, index) => (
        <div key={item.href || index} className="flex items-center">
          {index > 0 && (
            <svg className="w-4 h-4 mx-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}

          {item.isActive ? (
            <span className="flex items-center gap-2 text-foreground font-medium">
              {item.icon}
              {item.label}
            </span>
          ) : (
            <button
              onClick={() => router.push(item.href)}
              className="flex items-center gap-2 hover:text-foreground transition-colors"
            >
              {item.icon}
              {item.label}
            </button>
          )}
        </div>
      ))}
    </nav>
  )
}

export default Breadcrumb