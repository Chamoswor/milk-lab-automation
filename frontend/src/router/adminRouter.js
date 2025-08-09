import AddUserView from "@/views/admin/AddUserView.vue"

const admin_routes = [
    {
      path: '/admin',
      name: 'admin',
      //component: () => import('@/views/admin/AdminView.vue'),
    },
    {
      path: '/admin/add-user',
      name: 'add-user',
      component: AddUserView,
    },
]

export default admin_routes