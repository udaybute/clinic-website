import { getToken } from "@/lib/auth"

export const useAuth = () => {

 const token = getToken()

 return {
  isAuthenticated: !!token
 }

}