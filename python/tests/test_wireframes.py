import unittest
import pandas as pd

from feldera import SQLContext, SQLSchema
from tests import TEST_CLIENT


class TestWireframes(unittest.TestCase):
    def test_local(self):
        sql = SQLContext('notebook', TEST_CLIENT).get_or_create()

        TBL_NAMES = ['students', 'grades']
        view_name = "average_scores"

        df_students = pd.read_csv('students.csv')
        df_grades = pd.read_csv('grades.csv')

        sql.register_table(TBL_NAMES[0], SQLSchema({"name": "STRING", "id": "INT"}))
        sql.register_table(TBL_NAMES[1], SQLSchema({
            "student_id": "INT",
            "science": "INT",
            "maths": "INT",
            "art": "INT"
        }))

        query = f"SELECT name, ((science + maths + art) / 3) as average FROM {TBL_NAMES[0]} JOIN {TBL_NAMES[1]} on id = student_id ORDER BY average DESC"
        sql.register_view(view_name, query)

        sql.connect_source_pandas(TBL_NAMES[0], df_students)
        sql.connect_source_pandas(TBL_NAMES[1], df_grades)

        out = sql.listen(view_name)

        sql.run_to_completion()

        df = out.to_pandas()
        print()
        print(df)

    def test_two_SQLContexts(self):
        # https://github.com/feldera/feldera/issues/1770
        
        sql = SQLContext('sql_context1', TEST_CLIENT).get_or_create()
        sql2 = SQLContext('sql_context2', TEST_CLIENT).get_or_create()

        TBL_NAMES = ['students', 'grades']
        VIEW_NAMES = [n + "_view" for n in TBL_NAMES]

        df_students = pd.read_csv('students.csv')
        df_grades = pd.read_csv('grades.csv')

        sql.register_table(TBL_NAMES[0], SQLSchema({"name": "STRING", "id": "INT"}))
        sql2.register_table(TBL_NAMES[1], SQLSchema({
            "student_id": "INT",
            "science": "INT",
            "maths": "INT",
            "art": "INT"
        }))

        sql.register_view(VIEW_NAMES[0], f"SELECT * FROM {TBL_NAMES[0]}")
        sql2.register_view(VIEW_NAMES[1], f"SELECT * FROM {TBL_NAMES[1]}")

        sql.connect_source_pandas(TBL_NAMES[0], df_students)
        sql2.connect_source_pandas(TBL_NAMES[1], df_grades)

        out = sql.listen(VIEW_NAMES[0])
        out2 = sql2.listen(VIEW_NAMES[1])

        sql.run_to_completion()
        sql2.run_to_completion()

        df = out.to_pandas()
        df2 = out2.to_pandas()

        assert df.columns.tolist() not in df2.columns.tolist()


if __name__ == '__main__':
    unittest.main()
